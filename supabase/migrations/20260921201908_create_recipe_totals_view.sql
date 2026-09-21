-- Single source of truth for "what does this recipe cost, and what's its nutrient
-- profile" -- used by both the optimization backend and (later) the frontend, instead
-- of duplicating the aggregation math (sum of ingredient_nutrients * quantity/100,
-- sum of unit price * quantity) in Python and JS separately.
--
-- security_invoker = true: without it, a view runs with its OWNER's privileges (like
-- an implicit SECURITY DEFINER), which would silently bypass the RLS/GRANT model this
-- project relies on for every other table. Harmless here today (every table this view
-- reads is already open to any authenticated user), but the default is unsafe and this
-- project's policy is explicit access, not implicit.
--
-- Cost and nutrients are aggregated in separate CTEs, each joining recipe_ingredients
-- to only the one table it needs. Joining ingredients (1 price row per ingredient) and
-- ingredient_nutrients (4 rows per ingredient, one per nutrient_key) in the same
-- query fans out: each recipe_ingredients row would match 4 nutrient rows, and a
-- naive sum(cost) would then count that ingredient's price 4x. FILTER-based nutrient
-- sums are unaffected by that fan-out (each filter only matches its own nutrient_key),
-- which is why this bug slipped through until the cost totals were checked against a
-- hand calculation.

create view public.recipe_totals
with (security_invoker = true)
as
with costs as (
  select ri.recipe_id, sum((i.purchase_unit_price / i.purchase_unit_size) * ri.quantity) as cost
  from public.recipe_ingredients ri
  join public.ingredients i on i.id = ri.ingredient_id
  group by ri.recipe_id
),
nutrients as (
  select
    ri.recipe_id,
    sum(n.amount_per_100_units * ri.quantity / 100.0) filter (where n.nutrient_key = 'calories') as calories,
    sum(n.amount_per_100_units * ri.quantity / 100.0) filter (where n.nutrient_key = 'protein_g') as protein_g,
    sum(n.amount_per_100_units * ri.quantity / 100.0) filter (where n.nutrient_key = 'fat_g') as fat_g,
    sum(n.amount_per_100_units * ri.quantity / 100.0) filter (where n.nutrient_key = 'carbs_g') as carbs_g
  from public.recipe_ingredients ri
  join public.ingredient_nutrients n on n.ingredient_id = ri.ingredient_id
  group by ri.recipe_id
)
select
  r.id as recipe_id,
  r.name,
  r.prep_time_minutes,
  r.created_by,
  c.cost,
  nu.calories,
  nu.protein_g,
  nu.fat_g,
  nu.carbs_g
from public.recipes r
join costs c on c.recipe_id = r.id
join nutrients nu on nu.recipe_id = r.id;

grant select on public.recipe_totals to authenticated;
