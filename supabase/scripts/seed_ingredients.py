"""Starter ingredient list for the first USDA import pass.

Not a curated catalog -- just enough common ingredients (protein/grain/veg/fat staples)
to have real nutrient data to build and test recipes against. Extend freely.

Each entry pins an exact USDA fdcId rather than a search query: free-text search
against FDC's relevance ranking is not reproducible (a "sweet potato, raw" query
matched "Sweet Potato puffs, frozen" over the actual raw entry, for example) --
look up the fdcId once at https://fdc.nal.usda.gov/food-search, verify the
description, and pin it here.
"""

SEED_INGREDIENTS: list[tuple[str, int]] = [
    ("Chicken breast, raw", 2646170),
    ("Salmon, raw", 173686),
    ("Egg, whole, raw", 171287),
    ("White rice, raw", 168877),
    ("Lentils, raw", 172420),
    ("Broccoli, raw", 747447),
    ("Spinach, raw", 168462),
    ("Olive oil", 171413),
    ("Whole milk", 746782),
    ("Greek yogurt, plain", 2259794),
    ("Black beans, raw", 173734),
    ("Sweet potato, raw", 168482),
    ("Rolled oats", 2346396),
    ("Tofu, raw", 172475),
    ("Ground beef, 85% lean, raw", 171796),
]
