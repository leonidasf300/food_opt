"""Turns a solved meal plan into a shopping list: total ingredient quantities needed,
rounded up to whole commercial purchase units (you can't buy 0.3 of a bag), per
especificaciones/02-plan.md ("Portion Scaling & Rounding" / "Shopping Aggregation").

Pure, DB-free, like model.py -- fetching real recipe/ingredient data is data.py's job.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class RecipeIngredient:
    ingredient_name: str
    quantity_per_serving: float  # grams; matches ingredient_nutrients/purchase_unit_size's base unit
    purchase_unit_label: str | None
    purchase_unit_size: float | None  # grams; null if this ingredient has no pricing yet
    purchase_unit_price: float | None


@dataclass(frozen=True)
class ShoppingListItem:
    ingredient_name: str
    quantity_needed: float  # grams, raw total before rounding
    purchase_unit_label: str | None
    units_to_buy: int | None  # None when the ingredient has no purchase unit set yet
    cost: float | None


def build_shopping_list(
    servings_by_recipe: dict[str, int],
    recipe_ingredients: dict[str, list[RecipeIngredient]],
) -> list[ShoppingListItem]:
    """servings_by_recipe: total servings of each recipe across the whole plan (all days
    summed) -- not per-day. Ingredient quantities scale with total servings regardless
    of which day they're eaten.
    """
    quantity_needed: dict[str, float] = {}
    unit_info: dict[str, RecipeIngredient] = {}

    for recipe_name, servings in servings_by_recipe.items():
        if servings <= 0:
            continue
        for ingredient in recipe_ingredients.get(recipe_name, []):
            quantity_needed[ingredient.ingredient_name] = (
                quantity_needed.get(ingredient.ingredient_name, 0.0)
                + ingredient.quantity_per_serving * servings
            )
            # Purchase-unit metadata belongs to the ingredient, not the recipe -- every
            # recipe using "Chicken breast, raw" reports the same label/size/price, so
            # last-write-wins here is fine.
            unit_info[ingredient.ingredient_name] = ingredient

    items = []
    for name, quantity in quantity_needed.items():
        info = unit_info[name]
        if info.purchase_unit_size:
            units_to_buy = math.ceil(quantity / info.purchase_unit_size)
            cost = units_to_buy * info.purchase_unit_price if info.purchase_unit_price is not None else None
        else:
            units_to_buy = None
            cost = None
        items.append(
            ShoppingListItem(
                ingredient_name=name,
                quantity_needed=quantity,
                purchase_unit_label=info.purchase_unit_label,
                units_to_buy=units_to_buy,
                cost=cost,
            )
        )

    return sorted(items, key=lambda item: item.ingredient_name)
