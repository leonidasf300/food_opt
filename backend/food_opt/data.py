"""Fetches recipe data from Supabase (the recipe_totals view) for the optimizer.

Kept separate from model.py, which stays a pure, DB-free library -- easy to unit
test without a database, and reusable outside an HTTP context.
"""

from __future__ import annotations

import os

import psycopg

from .model import Recipe

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
