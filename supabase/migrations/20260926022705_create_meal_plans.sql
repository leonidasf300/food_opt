-- Persisted meal plans, so daily tracking (Seguimiento) can remember what was
-- prepared and when (see especificaciones/01-specify.md module 5). Before this the
-- generated plan only lived in the browser's localStorage.
--
-- One *active* plan per user (archived_at is null); generating a new one archives
-- the previous one instead of deleting it. Each plan day is one step of the
-- tracking timeline, completed in sequence (step 0 = shopping, on meal_plans itself).

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  num_days integer not null check (num_days > 0),
  total_cost numeric not null,
  total_prep_time_minutes numeric not null,
  -- Shopping list exactly as the optimization backend returned it (snapshot, so
  -- later price or recipe edits don't rewrite a plan already in progress).
  shopping_list jsonb not null default '[]'::jsonb,
  shopping_done_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index meal_plans_one_active_per_user on public.meal_plans (user_id) where archived_at is null;

create table public.meal_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.meal_plans (id) on delete cascade,
  day_index integer not null check (day_index >= 0),
  -- {"<recipe name>": servings}, same shape as the backend's DayPlan.servings.
  servings jsonb not null,
  completed_at timestamptz,
  unique (plan_id, day_index)
);

alter table public.meal_plans enable row level security;
alter table public.meal_plan_days enable row level security;

create policy "meal_plans_select_own" on public.meal_plans for select using (auth.uid() = user_id);
create policy "meal_plans_insert_own" on public.meal_plans for insert with check (auth.uid() = user_id);
create policy "meal_plans_update_own" on public.meal_plans for update using (auth.uid() = user_id);
create policy "meal_plans_delete_own" on public.meal_plans for delete using (auth.uid() = user_id);

create policy "meal_plan_days_select_own" on public.meal_plan_days for select
  using (exists (select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy "meal_plan_days_insert_own" on public.meal_plan_days for insert
  with check (exists (select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy "meal_plan_days_update_own" on public.meal_plan_days for update
  using (exists (select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy "meal_plan_days_delete_own" on public.meal_plan_days for delete
  using (exists (select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid()));

grant select, insert, update, delete on public.meal_plans to authenticated;
grant select, insert, update, delete on public.meal_plan_days to authenticated;

-- Archive the current active plan and store a new one in a single transaction, so
-- a failure halfway never leaves the user with zero or two active plans.
-- security invoker: runs as the calling user, RLS applies as usual.
create function public.save_meal_plan(plan jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_plan_id uuid;
begin
  update public.meal_plans
     set archived_at = now()
   where user_id = auth.uid() and archived_at is null;

  insert into public.meal_plans (user_id, num_days, total_cost, total_prep_time_minutes, shopping_list)
  values (
    auth.uid(),
    jsonb_array_length(plan -> 'days'),
    (plan ->> 'total_cost')::numeric,
    (plan ->> 'total_prep_time_minutes')::numeric,
    coalesce(plan -> 'shopping_list', '[]'::jsonb)
  )
  returning id into new_plan_id;

  insert into public.meal_plan_days (plan_id, day_index, servings)
  select new_plan_id, (d ->> 'day')::integer, d -> 'servings'
    from jsonb_array_elements(plan -> 'days') as d;

  return new_plan_id;
end;
$$;

revoke execute on function public.save_meal_plan(jsonb) from public, anon;
grant execute on function public.save_meal_plan(jsonb) to authenticated;
