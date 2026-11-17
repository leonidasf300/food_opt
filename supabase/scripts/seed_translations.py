"""ES/EN display names for the seed catalog (see migration 20261110230000_add_name_translations.sql).

Keys are the canonical names already in the DB: ingredients by their English USDA name
(seed_ingredients.py), recipes by their Spanish name (seed_recipes.py). Keep these in
sync when either seed file grows -- set_translations.py reports any name it can't find.
"""

# ingredient name (EN, canonical) -> Spanish display name
INGREDIENT_NAMES_ES: dict[str, str] = {
    "Chicken breast, raw": "Pechuga de pollo, cruda",
    "Salmon, raw": "Salmón, crudo",
    "Egg, whole, raw": "Huevo entero, crudo",
    "White rice, raw": "Arroz blanco, crudo",
    "Lentils, raw": "Lentejas, crudas",
    "Broccoli, raw": "Brócoli, crudo",
    "Spinach, raw": "Espinaca, cruda",
    "Olive oil": "Aceite de oliva",
    "Whole milk": "Leche entera",
    "Greek yogurt, plain": "Yogur griego natural",
    "Black beans, raw": "Frijoles negros, crudos",
    "Sweet potato, raw": "Batata, cruda",
    "Rolled oats": "Avena en hojuelas",
    "Tofu, raw": "Tofu, crudo",
    "Ground beef, 85% lean, raw": "Carne molida de res, 85% magra, cruda",
}

# ingredient name (EN, canonical) -> English purchase-unit label. The Spanish label is
# the one read off exito.com (set_prices_co.py); brand names are kept as-is.
PURCHASE_LABELS_EN: dict[str, str] = {
    "Chicken breast, raw": "1000 g bag (skinless breast x2, FRIKO)",
    "Salmon, raw": "450 g frozen pack (ANTILLANA)",
    "Egg, whole, raw": "Tray of 30 AA eggs (~1500 g, SMN)",
    "White rice, raw": "5000 g bag (DIANA vitamor)",
    "Lentils, raw": "1000 g bag (FRESCAMPO)",
    "Broccoli, raw": "200 g tray (florets)",
    "Spinach, raw": "300 g bag",
    "Olive oil": "1000 ml bottle, extra virgin (FRESCAMPO)",
    "Whole milk": "5400 ml UHT pack (FRESCAMPO)",
    "Greek yogurt, plain": "900 g tub, plain spoonable (COLANTA)",
    "Black beans, raw": "1000 g bag (FRESCAMPO)",
    "Sweet potato, raw": "1 unit (~150 g)",
    "Rolled oats": "500 g bag (EKONO)",
    "Tofu, raw": "400 g pack, plain (APETEI)",
    "Ground beef, 85% lean, raw": "450 g fresh tray (TAEQ)",
}

# recipe name (ES, canonical) -> English display name
RECIPE_NAMES_EN: dict[str, str] = {
    "Avena con leche": "Oats with milk",
    "Avena con yogurt y leche": "Oats with yogurt and milk",
    "Carne molida con arroz y brócoli": "Ground beef with rice and broccoli",
    "Carne molida con batata": "Ground beef with sweet potato",
    "Carne molida con lentejas y espinaca": "Ground beef with lentils and spinach",
    "Ensalada de huevo y espinaca": "Egg and spinach salad",
    "Frijoles negros con arroz": "Black beans with rice",
    "Frijoles negros con batata": "Black beans with sweet potato",
    "Huevos con batata": "Eggs with sweet potato",
    "Huevos revueltos con espinaca": "Scrambled eggs with spinach",
    "Lentejas con arroz": "Lentils with rice",
    "Lentejas con espinaca": "Lentils with spinach",
    "Pollo con arroz y brócoli": "Chicken with rice and broccoli",
    "Pollo con batata y espinaca": "Chicken with sweet potato and spinach",
    "Pollo con frijoles negros y arroz": "Chicken with black beans and rice",
    "Pollo con lentejas y espinaca": "Chicken with lentils and spinach",
    "Salmón con arroz y brócoli": "Salmon with rice and broccoli",
    "Salmón con batata": "Salmon with sweet potato",
    "Salmón con lentejas y espinaca": "Salmon with lentils and spinach",
    "Tofu con batata y brócoli": "Tofu with sweet potato and broccoli",
    "Tofu con lentejas y espinaca": "Tofu with lentils and spinach",
    "Tofu salteado con arroz y brócoli": "Stir-fried tofu with rice and broccoli",
    "Yogurt con avena": "Yogurt with oats",
}
