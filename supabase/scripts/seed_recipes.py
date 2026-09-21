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
    {
        "name": "Salmón con arroz y brócoli",
        "prep_time_minutes": 25,
        "ingredients": [
            ("Salmon, raw", 150),
            ("White rice, raw", 75),
            ("Broccoli, raw", 100),
            ("Olive oil", 5),
        ],
    },
    {
        "name": "Pollo con batata y espinaca",
        "prep_time_minutes": 25,
        "ingredients": [
            ("Chicken breast, raw", 150),
            ("Sweet potato, raw", 200),
            ("Spinach, raw", 60),
            ("Olive oil", 5),
        ],
    },
    {
        "name": "Lentejas con arroz",
        "prep_time_minutes": 25,
        "ingredients": [
            ("Lentils, raw", 80),
            ("White rice, raw", 75),
            ("Olive oil", 5),
        ],
    },
    {
        "name": "Tofu con lentejas y espinaca",
        "prep_time_minutes": 25,
        "ingredients": [
            ("Tofu, raw", 150),
            ("Lentils, raw", 60),
            ("Spinach, raw", 60),
            ("Olive oil", 5),
        ],
    },
    {
        "name": "Huevos con batata",
        "prep_time_minutes": 15,
        "ingredients": [
            ("Egg, whole, raw", 120),
            ("Sweet potato, raw", 150),
            ("Olive oil", 5),
        ],
    },
    {
        "name": "Avena con leche",
        "prep_time_minutes": 5,
        "ingredients": [
            ("Rolled oats", 60),
            ("Whole milk", 250),
        ],
    },
    {
        "name": "Avena con yogurt y leche",
        "prep_time_minutes": 5,
        "ingredients": [
            ("Rolled oats", 50),
            ("Greek yogurt, plain", 150),
            ("Whole milk", 100),
        ],
    },
    {
        "name": "Carne molida con arroz y brócoli",
        "prep_time_minutes": 30,
        "ingredients": [
            ("Ground beef, 85% lean, raw", 150),
            ("White rice, raw", 75),
            ("Broccoli, raw", 100),
            ("Olive oil", 5),
        ],
    },
    {
        "name": "Pollo con lentejas y espinaca",
        "prep_time_minutes": 25,
        "ingredients": [
            ("Chicken breast, raw", 150),
            ("Lentils, raw", 80),
            ("Spinach, raw", 60),
        ],
    },
    {
        "name": "Frijoles negros con batata",
        "prep_time_minutes": 30,
        "ingredients": [
            ("Black beans, raw", 80),
            ("Sweet potato, raw", 200),
            ("Olive oil", 5),
        ],
    },
    {
        "name": "Tofu con batata y brócoli",
        "prep_time_minutes": 25,
        "ingredients": [
            ("Tofu, raw", 150),
            ("Sweet potato, raw", 150),
            ("Broccoli, raw", 100),
            ("Olive oil", 5),
        ],
    },
    {
        "name": "Ensalada de huevo y espinaca",
        "prep_time_minutes": 10,
        "ingredients": [
            ("Egg, whole, raw", 120),
            ("Spinach, raw", 80),
            ("Olive oil", 10),
        ],
    },
    {
        "name": "Salmón con lentejas y espinaca",
        "prep_time_minutes": 25,
        "ingredients": [
            ("Salmon, raw", 150),
            ("Lentils, raw", 80),
            ("Spinach, raw", 60),
        ],
    },
    {
        "name": "Carne molida con lentejas y espinaca",
        "prep_time_minutes": 30,
        "ingredients": [
            ("Ground beef, 85% lean, raw", 150),
            ("Lentils, raw", 80),
            ("Spinach, raw", 60),
        ],
    },
    {
        "name": "Pollo con frijoles negros y arroz",
        "prep_time_minutes": 30,
        "ingredients": [
            ("Chicken breast, raw", 150),
            ("Black beans, raw", 80),
            ("White rice, raw", 75),
        ],
    },
]
