"""Fill the ES/EN display-name columns (ingredients.name_es, ingredients.purchase_unit_label_en,
recipes.name_en) from seed_translations.py.

Data, not schema: like set_prices_co.py, a migration would run before the import scripts
create these rows and silently update zero of them. Run it after import_usda.py,
set_prices_co.py and import_recipes.py. Idempotent -- plain UPDATEs matched by name.
Only touches seed rows (ingredients from USDA, recipes with no owner), never user recipes.

Usage: same env as the other scripts (.env with SUPABASE_DB_URL, or the local default --
see the CLAUDE.md warning about leaving SUPABASE_DB_URL uncommented).
    python set_translations.py
"""

from __future__ import annotations

import os

import psycopg
from dotenv import load_dotenv

from seed_translations import INGREDIENT_NAMES_ES, PURCHASE_LABELS_EN, RECIPE_NAMES_EN

load_dotenv()

DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:58322/postgres"


def main() -> int:
    db_url = os.environ.get("SUPABASE_DB_URL", DEFAULT_LOCAL_DB_URL)
    print(f"Target: {'LOCAL' if db_url == DEFAULT_LOCAL_DB_URL else 'SUPABASE_DB_URL from env (NOT local)'}")
    missing: list[str] = []
    # prepare_threshold=None: required against Supabase's transaction-mode pooler.
    with psycopg.connect(db_url, autocommit=True, prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            ingredients = 0
            for name, name_es in INGREDIENT_NAMES_ES.items():
                cur.execute(
                    """
                    update public.ingredients
                    set name_es = %s, purchase_unit_label_en = %s
                    where name = %s and source = 'usda'
                    """,
                    (name_es, PURCHASE_LABELS_EN.get(name), name),
                )
                if cur.rowcount == 0:
                    missing.append(f"ingredient {name!r}")
                ingredients += cur.rowcount

            recipes = 0
            for name, name_en in RECIPE_NAMES_EN.items():
                cur.execute(
                    "update public.recipes set name_en = %s where name = %s and created_by is null",
                    (name_en, name),
                )
                if cur.rowcount == 0:
                    missing.append(f"recipe {name!r}")
                recipes += cur.rowcount

    print(f"Updated {ingredients}/{len(INGREDIENT_NAMES_ES)} ingredients, {recipes}/{len(RECIPE_NAMES_EN)} recipes.")
    for item in missing:
        print(f"  not found: {item}")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
