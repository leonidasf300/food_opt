-- Lets an import script re-run safely (upsert on conflict) instead of creating
-- duplicate ingredient rows every time it's executed against the same source.
create unique index ingredients_source_external_id_key
  on public.ingredients (source, external_id)
  where external_id is not null;
