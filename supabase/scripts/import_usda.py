"""Import a snapshot of USDA FoodData Central ingredients into Supabase.

One-time/periodic data-loading script, not a migration: this is the "snapshot"
described in especificaciones/00-constitution.md -- it fetches nutrient data
once and writes it to the ingredients / ingredient_nutrients tables, it does
not query USDA live at request time.

Requires a personal (free) API key from https://api.data.gov/signup/?key --
the shared DEMO_KEY has a very low rate limit and isn't viable for a real
import. Purchase-unit label/size/price are intentionally left null: USDA has
no commercial pricing data, that's filled in later by a commercial API or
manual curation (see especificaciones/03-tasks.md).

Fetches each ingredient by its pinned fdcId (see seed_ingredients.py), not by
free-text search: FDC's relevance ranking isn't reproducible enough to trust
unattended (a "sweet potato, raw" query matched "Sweet Potato puffs, frozen"
ahead of the actual raw entry, for example).

Usage:
    Put USDA_API_KEY=... (and optionally SUPABASE_DB_URL=...) in a .env file next
    to this script (see .env.example), or export them in the shell:
        USDA_API_KEY=... python import_usda.py
"""

from __future__ import annotations

import os
import sys
import time

import psycopg
import requests
from dotenv import load_dotenv

from seed_ingredients import SEED_INGREDIENTS

load_dotenv()

FDC_FOOD_URL = "https://api.nal.usda.gov/fdc/v1/food/{fdc_id}"
DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:58322/postgres"

# nutrient_key -> USDA nutrient ids to try, in priority order (first match wins).
# USDA's Energy id varies by dataset vintage: 2047 (Atwater General Factors) is the
# current standard on Foundation foods; 1008 is the older id kept for SR Legacy foods.
NUTRIENT_MAP: dict[str, list[int]] = {
    "calories": [2047, 1008],
    "protein_g": [1003],
    "fat_g": [1004],
    "carbs_g": [1005],
}

REQUEST_DELAY_SECONDS = 1.0  # be polite to a shared public API


def get_food(fdc_id: int, api_key: str) -> dict:
    response = requests.get(FDC_FOOD_URL.format(fdc_id=fdc_id), params={"api_key": api_key}, timeout=15)
    response.raise_for_status()
    return response.json()


def extract_nutrients(food: dict) -> dict[str, float]:
    by_id = {
        n["nutrient"]["id"]: n["amount"]
        for n in food.get("foodNutrients", [])
        if "amount" in n and "nutrient" in n
    }
    result = {}
    for key, candidate_ids in NUTRIENT_MAP.items():
        for nutrient_id in candidate_ids:
            if nutrient_id in by_id:
                result[key] = by_id[nutrient_id]
                break
    return result


def upsert_ingredient(conn: psycopg.Connection, name: str, fdc_id: int) -> str:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.ingredients (name, source, external_id)
            values (%s, 'usda', %s)
            on conflict (source, external_id) where external_id is not null
            do update set name = excluded.name
            returning id
            """,
            (name, str(fdc_id)),
        )
        return cur.fetchone()[0]


def upsert_nutrients(conn: psycopg.Connection, ingredient_id: str, nutrients: dict[str, float]) -> None:
    with conn.cursor() as cur:
        for nutrient_key, amount in nutrients.items():
            cur.execute(
                """
                insert into public.ingredient_nutrients (ingredient_id, nutrient_key, amount_per_100_units)
                values (%s, %s, %s)
                on conflict (ingredient_id, nutrient_key)
                do update set amount_per_100_units = excluded.amount_per_100_units
                """,
                (ingredient_id, nutrient_key, amount),
            )


def main() -> int:
    api_key = os.environ.get("USDA_API_KEY")
    if not api_key:
        print("Set USDA_API_KEY (get a free key at https://api.data.gov/signup/?key).", file=sys.stderr)
        return 1

    db_url = os.environ.get("SUPABASE_DB_URL", DEFAULT_LOCAL_DB_URL)

    imported, skipped = 0, []
    # prepare_threshold=None: Supabase's transaction-mode pooler doesn't support
    # session-level prepared statements (each query may hit a different backend),
    # so psycopg's default auto-prepare-after-N-executions breaks with
    # DuplicatePreparedStatement once a query repeats enough times.
    with psycopg.connect(db_url, autocommit=True, prepare_threshold=None) as conn:
        for name, fdc_id in SEED_INGREDIENTS:
            food = get_food(fdc_id, api_key)

            nutrients = extract_nutrients(food)
            missing = set(NUTRIENT_MAP) - set(nutrients)
            if missing:
                skipped.append((name, f"missing nutrients {sorted(missing)} on fdcId={fdc_id}"))
                time.sleep(REQUEST_DELAY_SECONDS)
                continue

            ingredient_id = upsert_ingredient(conn, name, fdc_id)
            upsert_nutrients(conn, ingredient_id, nutrients)
            imported += 1
            print(f"  {name!r} <- fdcId={fdc_id} ({food['description']!r}): {nutrients}")
            time.sleep(REQUEST_DELAY_SECONDS)

    print(f"\nImported {imported}/{len(SEED_INGREDIENTS)} ingredients.")
    if skipped:
        print(f"Skipped {len(skipped)}:")
        for name, reason in skipped:
            print(f"  - {name}: {reason}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
