-- ES/EN display names for the catalog. The canonical `name` columns stay as they are
-- (ingredients: English, from USDA; recipes: Spanish) because other code keys on them:
-- import scripts match ingredients by name, and meal plans store recipe names.
-- These columns are display-only translations into the *other* language; null means
-- "no translation, show `name`" (e.g. user-created recipes).
--
-- Schema only. The translated values are filled by supabase/scripts/set_translations.py,
-- since the rows they update only exist after the import scripts have run.

alter table public.ingredients
  add column name_es text,
  add column purchase_unit_label_en text;

alter table public.recipes
  add column name_en text;

-- No new GRANTs needed: the existing table-level grants
-- (20260921161544_grant_table_privileges.sql) already cover new columns.
