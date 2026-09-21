from food_opt.shopping_list import RecipeIngredient, build_shopping_list

CHICKEN = RecipeIngredient(
    ingredient_name="Chicken breast, raw",
    quantity_per_serving=150,
    purchase_unit_label="1 lb (454 g) pack",
    purchase_unit_size=454,
    purchase_unit_price=4.50,
)
RICE = RecipeIngredient(
    ingredient_name="White rice, raw",
    quantity_per_serving=75,
    purchase_unit_label="2 lb (907 g) bag",
    purchase_unit_size=907,
    purchase_unit_price=2.50,
)
BROCCOLI = RecipeIngredient(
    ingredient_name="Broccoli, raw",
    quantity_per_serving=100,
    purchase_unit_label="1 lb (454 g) head",
    purchase_unit_size=454,
    purchase_unit_price=2.00,
)

RECIPE_INGREDIENTS = {
    "Pollo con arroz y brócoli": [CHICKEN, RICE, BROCCOLI],
    "Frijoles negros con arroz": [
        RecipeIngredient("Black beans, raw", 80, "1 lb (454 g) bag", 454, 1.80),
        RICE,
    ],
}


def test_aggregates_across_recipes_sharing_an_ingredient():
    # White rice appears in both recipes: 75g x 3 servings + 75g x 2 servings = 375g.
    items = build_shopping_list(
        {"Pollo con arroz y brócoli": 3, "Frijoles negros con arroz": 2},
        RECIPE_INGREDIENTS,
    )
    rice = next(item for item in items if item.ingredient_name == "White rice, raw")
    assert rice.quantity_needed == 375


def test_rounds_up_to_whole_purchase_units():
    # 3 servings x 150g chicken = 450g needed, pack is 454g -> ceil(450/454) = 1 pack,
    # not 0 (can't buy a fraction) and not 2 (450 < 454, one pack covers it).
    items = build_shopping_list({"Pollo con arroz y brócoli": 3}, RECIPE_INGREDIENTS)
    chicken = next(item for item in items if item.ingredient_name == "Chicken breast, raw")
    assert chicken.units_to_buy == 1
    assert chicken.cost == 4.50

    # 4 servings x 150g = 600g needed, pack is 454g -> ceil(600/454) = 2 packs.
    items = build_shopping_list({"Pollo con arroz y brócoli": 4}, RECIPE_INGREDIENTS)
    chicken = next(item for item in items if item.ingredient_name == "Chicken breast, raw")
    assert chicken.units_to_buy == 2
    assert chicken.cost == 9.00


def test_exact_multiple_of_purchase_unit_does_not_round_up_extra():
    # 1 serving x 75g rice repeated until it exactly hits a multiple of 907g would be
    # unrealistic to construct by hand; test the boundary directly instead.
    items = build_shopping_list(
        {"exact": 1},
        {"exact": [RecipeIngredient("Flour", 907, "907 g bag", 907, 3.00)]},
    )
    flour = items[0]
    assert flour.units_to_buy == 1


def test_zero_servings_excluded():
    items = build_shopping_list(
        {"Pollo con arroz y brócoli": 0, "Frijoles negros con arroz": 2},
        RECIPE_INGREDIENTS,
    )
    names = {item.ingredient_name for item in items}
    assert "Chicken breast, raw" not in names
    assert "Broccoli, raw" not in names
    assert "Black beans, raw" in names


def test_missing_purchase_unit_reports_quantity_without_cost():
    items = build_shopping_list(
        {"no price yet": 2},
        {"no price yet": [RecipeIngredient("Mystery ingredient", 50, None, None, None)]},
    )
    item = items[0]
    assert item.quantity_needed == 100
    assert item.units_to_buy is None
    assert item.cost is None


def test_items_sorted_by_name():
    items = build_shopping_list(
        {"Pollo con arroz y brócoli": 1, "Frijoles negros con arroz": 1},
        RECIPE_INGREDIENTS,
    )
    names = [item.ingredient_name for item in items]
    assert names == sorted(names)
