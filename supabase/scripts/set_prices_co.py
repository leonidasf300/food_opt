"""Set real Colombian retail pricing on the USDA seed ingredients.

Manually curated snapshot -- prices read by hand from exito.com (one of
Colombia's largest supermarket chains) on 2026-09-22. Not an API, not
automated: DANE SIPSA and DANE IPC were both investigated and ruled out as
a real-price source first (see especificaciones/00-constitution.md) --
SIPSA only covers wholesale fresh produce, IPC only publishes index
variation, not absolute prices. Until a real pricing API/feed is wired up,
this is the closest thing to real market data we have, and it WILL go
stale -- there's no scheduled refresh. Re-price by hand and bump the date
above when it does.

Where exito.com showed a "tarjeta Éxito" card-only discount, the regular
("Otros") price was used instead, since that's what any shopper actually
pays without the store's loyalty card -- not the flash-sale price.

Two prices are estimates, not read directly, because exito.com sells them
by the unit rather than by weight:
  - Egg: priced per egg ($550/huevo); converted to $/g assuming 50 g/egg.
  - Sweet potato: priced per "batata" unit ($1,358 c/u); converted
    assuming ~150 g/unit. This is the roughest number in this file.

Data, not schema: like import_usda.py, this is a script (not a migration)
because it writes to rows that only exist after import_usda.py has run --
a migration would run before that script and silently update zero rows.

purchase_unit_size is in the same base unit as ingredient_nutrients.amount_per_100_units
(grams) for every row here, including liquids (olive oil, milk): USDA's
Foundation/SR Legacy nutrient values are reported per 100g by mass even
for milk/oil, not per 100mL by volume, so recipe_ingredients.quantity must
also be grams to stay consistent with both -- mL is treated as ~g here,
same approximation the old placeholder script used (error is small:
olive oil ~0.92 g/mL, milk ~1.03 g/mL).

Usage: same env as import_usda.py (.env with SUPABASE_DB_URL, or the local default).
    python set_prices_co.py
"""

from __future__ import annotations

import os

import psycopg
from dotenv import load_dotenv

load_dotenv()

DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:58322/postgres"

# fdc_id -> (purchase_unit_label, purchase_unit_size_grams, purchase_unit_price_cop)
# Source: exito.com, read by hand 2026-09-22. See module docstring for caveats.
PRICES_CO: dict[str, tuple[str, float, float]] = {
    "2646170": ("Bolsa 1000 g (pechuga sin piel x2, FRIKO)", 1000, 26400),   # Chicken breast, raw
    "173686": ("Paquete 450 g congelado (ANTILLANA)", 450, 67800),          # Salmon, raw
    "171287": ("Cubeta x30 huevos AA (~1500 g, SMN)", 1500, 16500),         # Egg, whole, raw -- estimated 50g/egg
    "168877": ("Bolsa 5000 g (DIANA vitamor)", 5000, 21950),                # White rice, raw
    "172420": ("Bolsa 1000 g (FRESCAMPO)", 1000, 3900),                     # Lentils, raw
    "747447": ("Bandeja 200 g (tallos)", 200, 5656),                       # Broccoli, raw
    "168462": ("Bolsa 300 g", 300, 8480),                                   # Spinach, raw
    "171413": ("Botella 1000 ml extra virgen (FRESCAMPO)", 1000, 34950),    # Olive oil
    "746782": ("Paquete 5400 ml UHT (FRESCAMPO)", 5400, 18540),             # Whole milk
    "2259794": ("Vaso 900 g natural cuchareable (COLANTA)", 900, 23350),    # Greek yogurt, plain
    "173734": ("Bolsa 1000 g cabeza negra (FRESCAMPO)", 1000, 5770),        # Black beans, raw
    "168482": ("1 unidad (~150 g)", 150, 1358),                            # Sweet potato, raw -- estimated weight
    "2346396": ("Bolsa 500 g (EKONO)", 500, 2300),                         # Rolled oats
    "172475": ("Paquete 400 g natural (APETEI)", 400, 20900),              # Tofu, raw
    "171796": ("Bandeja 450 g fresca (TAEQ)", 450, 17050),                 # Ground beef, 85% lean, raw
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
            for fdc_id, (label, size, price) in PRICES_CO.items():
                cur.execute(
                    """
                    update public.ingredients
                    set purchase_unit_label = %s, purchase_unit_size = %s, purchase_unit_price = %s
                    where source = 'usda' and external_id = %s
                    """,
                    (label, size, price, fdc_id),
                )
                updated += cur.rowcount
    print(f"Updated {updated}/{len(PRICES_CO)} ingredients.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
