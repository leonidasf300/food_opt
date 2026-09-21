"""Starter ingredient list for the first USDA import pass.

Not a curated catalog -- just enough common ingredients (protein/grain/veg/fat staples)
to have real nutrient data to build and test recipes against. Extend freely; each entry
is a (display_name, usda_search_query) pair. The importer picks the top Foundation/SR
Legacy match for the query, so prefer specific queries (matching USDA's own naming
style, e.g. "chicken, breast, boneless, skinless, raw") over vague ones.
"""

SEED_INGREDIENTS: list[tuple[str, str]] = [
    ("Chicken breast, raw", "chicken, breast, boneless, skinless, raw"),
    ("Salmon, raw", "fish, salmon, atlantic, wild, raw"),
    ("Egg, whole, raw", "egg, whole, raw, fresh"),
    ("White rice, raw", "rice, white, long-grain, regular, raw"),
    ("Lentils, raw", "lentils, raw"),
    ("Broccoli, raw", "broccoli, raw"),
    ("Spinach, raw", "spinach, raw"),
    ("Olive oil", "oil, olive, salad or cooking"),
    ("Whole milk", "milk, whole, 3.25% milkfat"),
    ("Greek yogurt, plain", "yogurt, greek, plain, whole milk"),
    ("Black beans, raw", "beans, black, mature seeds, raw"),
    ("Sweet potato, raw", "sweet potato, raw, unprepared"),
    ("Rolled oats", "oats"),
    ("Tofu, raw", "tofu, raw, firm"),
    ("Ground beef, raw", "beef, ground, 85% lean meat / 15% fat, raw"),
]
