-- Explicit table-level GRANTs for the `authenticated` role.
--
-- RLS policies alone don't make a table reachable through the Data API: Postgres
-- checks table-level privileges *before* evaluating RLS, so a role with no GRANT
-- gets "permission denied" regardless of what the policies say. New Supabase
-- projects can auto-grant these on table creation ("Automatically expose new
-- tables"), but that's a per-project dashboard toggle Supabase itself recommends
-- disabling for explicit control -- so these grants can't be implicit, they need
-- to be part of the migration, independent of that setting.
--
-- No table grants `anon`: everything in this schema requires authentication.

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.preferences to authenticated;
grant select, insert, update, delete on public.user_nutrient_targets to authenticated;

-- Reference data: read-only for clients, writes only via service_role imports
-- (which bypass RLS and grants), per especificaciones/00-constitution.md.
grant select on public.ingredients to authenticated;
grant select on public.ingredient_nutrients to authenticated;

grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
