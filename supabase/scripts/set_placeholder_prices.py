"""Set placeholder US grocery pricing on the USDA seed ingredients.

Rough estimates, not sourced from any pricing API -- exists only so the optimizer has
a cost to work with while real pricing sourcing is still undecided (market/API choice
tracked in especificaciones/00-constitution.md). Replace when a real source is wired up.

Data, not schema: like import_usda.py, this is a script (not a migration) because it
writes to rows that only exist after import_usda.py has run -- a migration would run
before that script and silently update zero rows.

purchase_unit_size is in the same base unit as ingredient_nutrients.amount_per_100_units
(grams) for every row here, including liquids: USDA's Foundation/SR Legacy nutrient
values are reported per 100g by mass even for milk/oil, not per 100mL by volume, so
recipe_ingredients.quantity must also be grams to stay consistent with both.

Usage: same env as import_usda.py (.env with SUPABASE_DB_URL, or the local default).
    python set_placeholder_prices.py
"""

from __future__ import annotations

import os

import psycopg
from dotenv import load_dotenv

load_dotenv()

DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:58322/postgres"

# fdc_id -> (purchase_unit_label, purchase_unit_size_grams, purchase_unit_price_usd)
PLACEHOLDER_PRICES: dict[str, tuple[str, float, float]] = {
    "2646170": ("1 lb (454 g) pack", 454, 4.50),   # Chicken breast, raw
    "173686": ("1 lb (454 g) pack", 454, 9.00),    # Salmon, raw
    "171287": ("dozen (~600 g)", 600, 3.00),        # Egg, whole, raw
    "168877": ("2 lb (907 g) bag", 907, 2.50),      # White rice, raw
    "172420": ("1 lb (454 g) bag", 454, 2.00),      # Lentils, raw
    "747447": ("1 lb (454 g) head", 454, 2.00),     # Broccoli, raw
    "168462": ("5 oz (142 g) bag", 142, 2.50),      # Spinach, raw
    "171413": ("500 g bottle", 500, 8.00),          # Olive oil
    "746782": ("1000 g carton", 1000, 1.20),        # Whole milk
    "2259794": ("500 g tub", 500, 4.00),             # Greek yogurt, plain
    "173734": ("1 lb (454 g) bag", 454, 1.80),      # Black beans, raw
    "168482": ("1000 g bag", 1000, 2.50),           # Sweet potato, raw
    "2346396": ("1000 g container", 1000, 3.50),     # Rolled oats
    "172475": ("396 g (14 oz) pack", 396, 2.50),    # Tofu, raw
    "171796": ("1 lb (454 g) pack", 454, 5.50),     # Ground beef, 85% lean, raw
}


def main() -> int:
    db_url = os.environ.get("SUPABASE_DB_URL", DEFAULT_LOCAL_DB_URL)
    updated = 0
    # prepare_threshold=None: Supabase's transaction-mode pooler doesn't support
    # session-level prepared statements (each query may hit a different backend),
    # so psycopg's default auto-prepare-after-N-executions breaks with
    # DuplicatePreparedStatement once a query repeats enough times.
    with psycopg.connect(db_url, autocommit=True, prepare_threshold=None) as conn:
        with conn.cursor() as cur:
            for fdc_id, (label, size, price) in PLACEHOLDER_PRICES.items():
                cur.execute(
                    """
                    update public.ingredients
                    set purchase_unit_label = %s, purchase_unit_size = %s, purchase_unit_price = %s
                    where source = 'usda' and external_id = %s
                    """,
                    (label, size, price, fdc_id),
                )
                updated += cur.rowcount
    print(f"Updated {updated}/{len(PLACEHOLDER_PRICES)} ingredients.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
