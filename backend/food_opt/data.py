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


def fetch_recipes(db_url: str | None = None) -> list[Recipe]:
    db_url = db_url or os.environ.get("SUPABASE_DB_URL", DEFAULT_LOCAL_DB_URL)
    recipes: list[Recipe] = []
    # prepare_threshold=None: see supabase/scripts/import_usda.py for why this is
    # required against Supabase's transaction-mode connection pooler.
    with psycopg.connect(db_url, autocommit=True, prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select name, cost, prep_time_minutes, calories, protein_g, fat_g, carbs_g
                from public.recipe_totals
                """
            )
            for name, cost, prep_time_minutes, calories, protein_g, fat_g, carbs_g in cur.fetchall():
                recipes.append(
                    Recipe(
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
    recipe_names: list[str], db_url: str | None = None
) -> dict[str, list[RecipeIngredient]]:
    """Per-recipe ingredient breakdown, for building a shopping list from a solved
    plan (see shopping_list.py). Restricted to `recipe_names` rather than fetching
    everything, since a plan only ever uses a handful of the available recipes.
    """
    db_url = db_url or os.environ.get("SUPABASE_DB_URL", DEFAULT_LOCAL_DB_URL)
    by_recipe: dict[str, list[RecipeIngredient]] = {name: [] for name in recipe_names}
    if not recipe_names:
        return by_recipe

    with psycopg.connect(db_url, autocommit=True, prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select r.name, i.name, ri.quantity,
                       i.purchase_unit_label, i.purchase_unit_size, i.purchase_unit_price
                from public.recipe_ingredients ri
                join public.recipes r on r.id = ri.recipe_id
                join public.ingredients i on i.id = ri.ingredient_id
                where r.name = any(%s)
                """,
                (recipe_names,),
            )
            for recipe_name, ingredient_name, quantity, label, size, price in cur.fetchall():
                by_recipe[recipe_name].append(
                    RecipeIngredient(
                        ingredient_name=ingredient_name,
                        quantity_per_serving=float(quantity),
                        purchase_unit_label=label,
                        purchase_unit_size=float(size) if size is not None else None,
                        purchase_unit_price=float(price) if price is not None else None,
                    )
                )
    return by_recipe
