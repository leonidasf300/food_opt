"""Import the sample recipes from seed_recipes.py, then print each recipe's aggregated
nutrient totals and cost so they can be checked by hand before anything is built on
top of them (the optimizer, a results screen, etc.).

Idempotent: re-running deletes and re-inserts recipes matched by name among global
recipes (created_by is null) via recipe_ingredients' ON DELETE CASCADE, rather than
duplicating them.

Usage: same env as import_usda.py.
    python import_recipes.py
"""

from __future__ import annotations

import os

import psycopg
from dotenv import load_dotenv

from seed_recipes import RECIPES

load_dotenv()

DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:58322/postgres"


def upsert_recipe(conn: psycopg.Connection, name: str, prep_time_minutes: float) -> str:
    with conn.cursor() as cur:
        cur.execute("delete from public.recipes where name = %s and created_by is null", (name,))
        cur.execute(
            "insert into public.recipes (name, prep_time_minutes) values (%s, %s) returning id",
            (name, prep_time_minutes),
        )
        return cur.fetchone()[0]


def add_ingredient(conn: psycopg.Connection, recipe_id: str, ingredient_name: str, quantity_g: float) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "select id from public.ingredients where name = %s and source = 'usda'", (ingredient_name,)
        )
        row = cur.fetchone()
        if row is None:
            raise RuntimeError(f"ingredient not found: {ingredient_name!r} (run import_usda.py first)")
        cur.execute(
            """
            insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
            values (%s, %s, %s, 'g')
            """,
            (recipe_id, row[0], quantity_g),
        )


def totals_for(conn: psycopg.Connection, recipe_id: str) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            select n.nutrient_key, sum(n.amount_per_100_units * ri.quantity / 100.0)
            from public.recipe_ingredients ri
            join public.ingredient_nutrients n on n.ingredient_id = ri.ingredient_id
            where ri.recipe_id = %s
            group by n.nutrient_key
            """,
            (recipe_id,),
        )
        nutrients = dict(cur.fetchall())

        cur.execute(
            """
            select sum((i.purchase_unit_price / i.purchase_unit_size) * ri.quantity)
            from public.recipe_ingredients ri
            join public.ingredients i on i.id = ri.ingredient_id
            where ri.recipe_id = %s
            """,
            (recipe_id,),
        )
        cost = cur.fetchone()[0]

    return {"cost": cost, **nutrients}


def main() -> int:
    db_url = os.environ.get("SUPABASE_DB_URL", DEFAULT_LOCAL_DB_URL)
    # prepare_threshold=None: Supabase's transaction-mode pooler doesn't support
    # session-level prepared statements (each query may hit a different backend),
    # so psycopg's default auto-prepare-after-N-executions breaks with
    # DuplicatePreparedStatement once a query repeats enough times.
    with psycopg.connect(db_url, autocommit=True, prepare_threshold=None) as conn:
        for recipe in RECIPES:
            recipe_id = upsert_recipe(conn, recipe["name"], recipe["prep_time_minutes"])
            for ingredient_name, quantity_g in recipe["ingredients"]:
                add_ingredient(conn, recipe_id, ingredient_name, quantity_g)

            totals = totals_for(conn, recipe_id)
            print(f"{recipe['name']!r} (prep {recipe['prep_time_minutes']} min):")
            print(
                f"  cost=${totals.get('cost', 0):.2f}  calories={totals.get('calories', 0):.1f}"
                f"  protein_g={totals.get('protein_g', 0):.1f}  fat_g={totals.get('fat_g', 0):.1f}"
                f"  carbs_g={totals.get('carbs_g', 0):.1f}"
            )

    print(f"\nImported {len(RECIPES)} recipes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
