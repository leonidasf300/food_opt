"""Sample recipes for local/dev testing of the optimizer, built from the 15 USDA seed
ingredients. Not a curated catalog -- just enough variety to exercise the solver.

Quantities are in grams (raw ingredient weight), matching the base unit of
ingredient_nutrients.amount_per_100_units and purchase_unit_size (see
set_placeholder_prices.py for why that unit choice matters).
"""

RECIPES: list[dict] = [
    {
        "name": "Pollo con arroz y brócoli",
        "prep_time_minutes": 25,
        "ingredients": [
            ("Chicken breast, raw", 150),
            ("White rice, raw", 75),
            ("Broccoli, raw", 100),
        ],
    },
    {
        "name": "Salmón con batata",
        "prep_time_minutes": 20,
        "ingredients": [
            ("Salmon, raw", 150),
            ("Sweet potato, raw", 200),
            ("Olive oil", 10),
        ],
    },
    {
        "name": "Lentejas con espinaca",
        "prep_time_minutes": 30,
        "ingredients": [
            ("Lentils, raw", 80),
            ("Spinach, raw", 60),
            ("Olive oil", 10),
        ],
    },
    {
        "name": "Tofu salteado con arroz y brócoli",
        "prep_time_minutes": 20,
        "ingredients": [
            ("Tofu, raw", 150),
            ("White rice, raw", 75),
            ("Broccoli, raw", 100),
            ("Olive oil", 10),
        ],
    },
    {
        "name": "Yogurt con avena",
        "prep_time_minutes": 5,
        "ingredients": [
            ("Greek yogurt, plain", 200),
            ("Rolled oats", 50),
        ],
    },
    {
        "name": "Carne molida con batata",
        "prep_time_minutes": 25,
        "ingredients": [
            ("Ground beef, 85% lean, raw", 150),
            ("Sweet potato, raw", 200),
            ("Olive oil", 5),
        ],
    },
    {
        "name": "Huevos revueltos con espinaca",
        "prep_time_minutes": 10,
        "ingredients": [
            ("Egg, whole, raw", 120),
            ("Spinach, raw", 60),
            ("Olive oil", 5),
        ],
    },
    {
        "name": "Frijoles negros con arroz",
        "prep_time_minutes": 30,
        "ingredients": [
            ("Black beans, raw", 80),
            ("White rice, raw", 75),
            ("Olive oil", 5),
        ],
    },
]
