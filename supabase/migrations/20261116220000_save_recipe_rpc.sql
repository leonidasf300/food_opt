-- Create or edit a recipe together with its ingredient list in one transaction.
--
-- The frontend used to do this as separate Data API calls: update the recipe, delete
-- all of its recipe_ingredients, insert the new ones. If the last insert failed (e.g.
-- the same ingredient listed twice, which violates the (recipe_id, ingredient_id)
-- primary key) the earlier delete had already been committed, so an edit left the
-- recipe with no ingredients at all, and a create left an orphan recipe behind.
-- A function body runs in a single transaction: any failure rolls everything back.
--
-- security invoker: runs as the calling user, RLS applies as usual (same as
-- save_meal_plan). The explicit created_by check on update is there to turn "RLS
-- silently matched zero rows" into an error instead of a no-op that then tries to
-- attach ingredients to someone else's recipe.
--
-- Parameters are p_-prefixed so they can't be confused with the column names.

create function public.save_recipe(
  p_recipe_id uuid,          -- null = create a new recipe
  p_name text,
  p_prep_time_minutes numeric,
  p_ingredients jsonb        -- [{"ingredient_id": "<uuid>", "quantity": <grams>}, ...]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id uuid;
begin
  if p_ingredients is null or jsonb_typeof(p_ingredients) <> 'array' or jsonb_array_length(p_ingredients) = 0 then
    raise exception 'a recipe needs at least one ingredient' using errcode = '22023';
  end if;

  if p_recipe_id is null then
    insert into public.recipes (name, prep_time_minutes, created_by)
    values (p_name, p_prep_time_minutes, auth.uid())
    returning id into target_id;
  else
    update public.recipes
       set name = p_name, prep_time_minutes = p_prep_time_minutes
     where id = p_recipe_id and created_by = auth.uid()
    returning id into target_id;

    if target_id is null then
      raise exception 'recipe not found, or not owned by the current user' using errcode = '42501';
    end if;

    delete from public.recipe_ingredients where recipe_id = target_id;
  end if;

  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  select target_id, (line ->> 'ingredient_id')::uuid, (line ->> 'quantity')::numeric, 'g'
    from jsonb_array_elements(p_ingredients) as line;

  return target_id;
end;
$$;

revoke execute on function public.save_recipe(uuid, text, numeric, jsonb) from public, anon;
grant execute on function public.save_recipe(uuid, text, numeric, jsonb) to authenticated;
