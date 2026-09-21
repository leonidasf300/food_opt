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

Usage:
    USDA_API_KEY=... python import_usda.py
    USDA_API_KEY=... SUPABASE_DB_URL=postgresql://... python import_usda.py
"""

from __future__ import annotations

import os
import sys
import time

import psycopg
import requests

from seed_ingredients import SEED_INGREDIENTS

FDC_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
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


def search_food(query: str, api_key: str) -> dict | None:
    response = requests.get(
        FDC_SEARCH_URL,
        params={
            "query": query,
            "dataType": "Foundation,SR Legacy",
            "pageSize": 1,
            "api_key": api_key,
        },
        timeout=15,
    )
    response.raise_for_status()
    foods = response.json().get("foods", [])
    return foods[0] if foods else None


def extract_nutrients(food: dict) -> dict[str, float]:
    by_id = {n["nutrientId"]: n["value"] for n in food.get("foodNutrients", []) if "value" in n}
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
    with psycopg.connect(db_url, autocommit=True) as conn:
        for name, query in SEED_INGREDIENTS:
            food = search_food(query, api_key)
            if food is None:
                skipped.append((name, "no match in Foundation/SR Legacy"))
                time.sleep(REQUEST_DELAY_SECONDS)
                continue

            nutrients = extract_nutrients(food)
            missing = set(NUTRIENT_MAP) - set(nutrients)
            if missing:
                skipped.append((name, f"missing nutrients {sorted(missing)} on fdcId={food['fdcId']}"))
                time.sleep(REQUEST_DELAY_SECONDS)
                continue

            ingredient_id = upsert_ingredient(conn, name, food["fdcId"])
            upsert_nutrients(conn, ingredient_id, nutrients)
            imported += 1
            print(f"  {name!r} <- fdcId={food['fdcId']} ({food['description']!r}): {nutrients}")
            time.sleep(REQUEST_DELAY_SECONDS)

    print(f"\nImported {imported}/{len(SEED_INGREDIENTS)} ingredients.")
    if skipped:
        print(f"Skipped {len(skipped)}:")
        for name, reason in skipped:
            print(f"  - {name}: {reason}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
