-- Core schema: user profiles/preferences, nutrient targets, recipes and ingredients.
-- See especificaciones/01-specify.md (modules) and especificaciones/02-plan.md (model inputs).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- Weighting sliders (Constitution principle 3): stored as integer percentage points
-- so they match the UI directly and sum to a clean 100 without float rounding issues.
create table public.preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  weight_cost integer not null,
  weight_variety integer not null,
  weight_prep_time integer not null,
  updated_at timestamptz not null default now(),
  constraint weights_sum_to_100 check (weight_cost + weight_variety + weight_prep_time = 100),
  constraint weights_non_negative check (weight_cost >= 0 and weight_variety >= 0 and weight_prep_time >= 0)
);

create table public.user_nutrient_targets (
  user_id uuid not null references public.profiles (id) on delete cascade,
  nutrient_key text not null,
  minimum numeric not null,
  maximum numeric not null,
  primary key (user_id, nutrient_key),
  constraint target_range_valid check (minimum <= maximum)
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null check (source in ('usda', 'commercial_api', 'manual')),
  external_id text,
  purchase_unit_label text not null,
  purchase_unit_size numeric not null,
  purchase_unit_price numeric not null,
  created_at timestamptz not null default now()
);

-- Nutrient amounts per 100 base units (USDA convention: per 100g/100ml), one row per ingredient/nutrient pair.
create table public.ingredient_nutrients (
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  nutrient_key text not null,
  amount_per_100_units numeric not null,
  primary key (ingredient_id, nutrient_key)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prep_time_minutes numeric not null,
  created_by uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Enables nutrient totals per recipe and shopping-list aggregation with traceability
-- back to the originating recipe/portion (Constitution principle 4).
create table public.recipe_ingredients (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  quantity numeric not null,
  unit text not null,
  primary key (recipe_id, ingredient_id)
);

-- Row Level Security -------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.user_nutrient_targets enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_nutrients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

-- profiles / preferences / user_nutrient_targets: strictly per-user data.
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "preferences_select_own" on public.preferences for select using (auth.uid() = user_id);
create policy "preferences_insert_own" on public.preferences for insert with check (auth.uid() = user_id);
create policy "preferences_update_own" on public.preferences for update using (auth.uid() = user_id);

create policy "targets_select_own" on public.user_nutrient_targets for select using (auth.uid() = user_id);
create policy "targets_insert_own" on public.user_nutrient_targets for insert with check (auth.uid() = user_id);
create policy "targets_update_own" on public.user_nutrient_targets for update using (auth.uid() = user_id);
create policy "targets_delete_own" on public.user_nutrient_targets for delete using (auth.uid() = user_id);

-- ingredients / ingredient_nutrients: shared reference data, read-only from the client.
-- Writes only happen through imports run with the service role, which bypasses RLS.
create policy "ingredients_select_authenticated" on public.ingredients for select using (auth.role() = 'authenticated');
create policy "ingredient_nutrients_select_authenticated" on public.ingredient_nutrients for select using (auth.role() = 'authenticated');

-- recipes: any authenticated user can read all recipes; only the owner can write their own.
-- Seed/global recipes (created_by is null) are not editable by end users.
create policy "recipes_select_authenticated" on public.recipes for select using (auth.role() = 'authenticated');
create policy "recipes_insert_own" on public.recipes for insert with check (auth.uid() = created_by);
create policy "recipes_update_own" on public.recipes for update using (auth.uid() = created_by);
create policy "recipes_delete_own" on public.recipes for delete using (auth.uid() = created_by);

-- recipe_ingredients: readable by anyone who can read recipes; writable only by the parent recipe's owner.
create policy "recipe_ingredients_select_authenticated" on public.recipe_ingredients for select using (auth.role() = 'authenticated');
create policy "recipe_ingredients_insert_own" on public.recipe_ingredients for insert with check (
  exists (select 1 from public.recipes r where r.id = recipe_id and r.created_by = auth.uid())
);
create policy "recipe_ingredients_update_own" on public.recipe_ingredients for update using (
  exists (select 1 from public.recipes r where r.id = recipe_id and r.created_by = auth.uid())
);
create policy "recipe_ingredients_delete_own" on public.recipe_ingredients for delete using (
  exists (select 1 from public.recipes r where r.id = recipe_id and r.created_by = auth.uid())
);
