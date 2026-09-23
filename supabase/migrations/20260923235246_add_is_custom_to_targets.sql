-- Distinguishes "saved the auto-computed suggestion as-is" from "user took manual
-- control via Personalizar". Without this, saving the locked/computed view even
-- once (accepting the suggestion) permanently overrides recomputing from newer
-- body_profiles measurements -- there's no way back to the locked/auto view.
alter table public.user_nutrient_targets add column is_custom boolean not null default false;
