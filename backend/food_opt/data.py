"""Fetches recipe data from Supabase (the recipe_totals view) for the optimizer.

Kept separate from model.py, which stays a pure, DB-free library -- easy to unit
test without a database, and reusable outside an HTTP context.
"""

from __future__ import annotations

import os

import psycopg

from .model import Recipe
from .shopping_list import RecipeIngredient

DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:58322/postgres"


def fetch_recipes(user_id: str | None = None, db_url: str | None = None) -> list[Recipe]:
    """Recipes the optimizer may use for `user_id`: the seed/global ones
    (created_by is null) plus that user's own. Without a user_id, seed recipes only.

    This connects as the DB owner, so RLS doesn't apply here -- the created_by filter
    is what keeps one user's recipes out of another user's plan.

    Names are made unique (`distinct on (name)`): the model and the stored plans key
    recipes by name, but recipes.name has no unique constraint. When a user's recipe
    shares a name with a seed one the user's own wins, the same rule the frontend's
    tracking page applies when it resolves a plan's recipe names.
    """
    db_url = db_url or os.environ.get("SUPABASE_DB_URL", DEFAULT_LOCAL_DB_URL)
    recipes: list[Recipe] = []
    # prepare_threshold=None: see supabase/scripts/import_usda.py for why this is
    # required against Supabase's transaction-mode connection pooler.
    with psycopg.connect(db_url, autocommit=True, prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select distinct on (name)
                       recipe_id, name, cost, prep_time_minutes, calories, protein_g, fat_g, carbs_g
                from public.recipe_totals
                where created_by is null or created_by = %s::uuid
                order by name, (created_by is null), recipe_id
                """,
                (user_id,),
            )
            for recipe_id, name, cost, prep_time_minutes, calories, protein_g, fat_g, carbs_g in cur.fetchall():
                recipes.append(
                    Recipe(
                        id=str(recipe_id),
                        name=name,
                        cost=float(cost),
                        prep_time_minutes=float(prep_time_minutes),
                        nutrients={
                            "calories": float(calories or 0),
                            "protein_g": float(protein_g or 0),
                            "fat_g": float(fat_g or 0),
                            "carbs_g": float(carbs_g or 0),
                        },
                    )
                )
    return recipes


def fetch_recipe_ingredients(
    recipes: list[Recipe], db_url: str | None = None
) -> dict[str, list[RecipeIngredient]]:
    """Per-recipe ingredient breakdown, keyed by recipe name, for building a shopping
    list from a solved plan (see shopping_list.py). Restricted to `recipes` rather than
    fetching everything, since a plan only ever uses a handful of the available recipes.

    Looked up by recipe id, not name: two recipes can share a name, and matching on it
    pulled in both recipes' ingredients and double-counted the shopping list.
    """
    db_url = db_url or os.environ.get("SUPABASE_DB_URL", DEFAULT_LOCAL_DB_URL)
    by_recipe: dict[str, list[RecipeIngredient]] = {r.name: [] for r in recipes}
    name_by_id = {r.id: r.name for r in recipes if r.id is not None}
    if not name_by_id:
        return by_recipe

    with psycopg.connect(db_url, autocommit=True, prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select ri.recipe_id, i.name, ri.quantity,
                       i.purchase_unit_label, i.purchase_unit_size, i.purchase_unit_price
                from public.recipe_ingredients ri
                join public.ingredients i on i.id = ri.ingredient_id
                where ri.recipe_id = any(%s::uuid[])
                """,
                (list(name_by_id),),
            )
            for recipe_id, ingredient_name, quantity, label, size, price in cur.fetchall():
                by_recipe[name_by_id[str(recipe_id)]].append(
                    RecipeIngredient(
                        ingredient_name=ingredient_name,
                        quantity_per_serving=float(quantity),
                        purchase_unit_label=label,
                        purchase_unit_size=float(size) if size is not None else None,
                        purchase_unit_price=float(price) if price is not None else None,
                    )
                )
    return by_recipe
