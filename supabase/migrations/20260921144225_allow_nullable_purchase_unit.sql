-- Ingredients are now imported in stages: nutrient data first (from USDA), commercial
-- purchase-unit/price data later (commercial APIs or manual curation, per
-- especificaciones/00-constitution.md). The original NOT NULL constraints assumed both
-- arrived together, which blocks the USDA-only import step. Relax them; the app layer
-- should treat a null purchase_unit_price as "not yet priced", not "free".

alter table public.ingredients
  alter column purchase_unit_label drop not null,
  alter column purchase_unit_size drop not null,
  alter column purchase_unit_price drop not null;
