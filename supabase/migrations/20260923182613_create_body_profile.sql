-- Body profile: optional per-user body metrics + a generic goal, used to precompute
-- suggested nutrient target ranges (see especificaciones/01-specify.md module 4).
-- 1:1 with profiles, same ownership/RLS pattern as preferences and user_nutrient_targets.

create table public.body_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  sex text not null check (sex in ('male', 'female')),
  age integer not null check (age > 0 and age < 120),
  height_cm numeric not null check (height_cm > 0),
  weight_kg numeric not null check (weight_kg > 0),
  neck_cm numeric check (neck_cm > 0),
  waist_cm numeric check (waist_cm > 0),
  hip_cm numeric check (hip_cm > 0),
  goal text not null check (goal in ('maintain', 'lose_fat', 'lose_weight', 'gain_muscle')),
  updated_at timestamptz not null default now()
);

alter table public.body_profiles enable row level security;

create policy "body_profiles_select_own" on public.body_profiles for select using (auth.uid() = user_id);
create policy "body_profiles_insert_own" on public.body_profiles for insert with check (auth.uid() = user_id);
create policy "body_profiles_update_own" on public.body_profiles for update using (auth.uid() = user_id);
create policy "body_profiles_delete_own" on public.body_profiles for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.body_profiles to authenticated;
