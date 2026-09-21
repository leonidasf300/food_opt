import pyomo.environ as pyo
import pytest

from food_opt.model import NutrientTarget, Recipe, Weights, build_model, solve

RECIPES = [
    Recipe(name="chicken_rice", cost=3.0, prep_time_minutes=25, nutrients={"calories": 600, "protein_g": 40}),
    Recipe(name="lentil_soup", cost=1.5, prep_time_minutes=15, nutrients={"calories": 400, "protein_g": 20}),
    Recipe(name="salmon_salad", cost=6.0, prep_time_minutes=10, nutrients={"calories": 500, "protein_g": 35}),
]

TARGETS = {
    "calories": NutrientTarget(minimum=1800, maximum=2200),
    "protein_g": NutrientTarget(minimum=100, maximum=200),
}


def test_weights_must_sum_to_one():
    Weights(cost=0.4, variety=0.3, prep_time=0.3)  # does not raise
    with pytest.raises(ValueError):
        Weights(cost=0.5, variety=0.3, prep_time=0.3)


def test_weights_reject_negative():
    with pytest.raises(ValueError):
        Weights(cost=-0.1, variety=0.6, prep_time=0.5)


def test_solve_satisfies_nutrient_bounds_each_day():
    weights = Weights(cost=0.4, variety=0.3, prep_time=0.3)
    model = build_model(RECIPES, num_days=3, nutrient_targets=TARGETS, weights=weights)
    result = solve(model)

    assert str(result.solver.termination_condition) == "optimal"

    recipe_by_name = {r.name: r for r in RECIPES}
    for d in model.DAYS:
        for nutrient, target in TARGETS.items():
            total = sum(
                recipe_by_name[r].nutrients.get(nutrient, 0.0) * pyo.value(model.x[r, d]) for r in model.RECIPES
            )
            assert target.minimum - 1e-6 <= total <= target.maximum + 1e-6


def test_variety_indicator_matches_actual_usage():
    weights = Weights(cost=0.2, variety=0.6, prep_time=0.2)
    model = build_model(RECIPES, num_days=2, nutrient_targets=TARGETS, weights=weights)
    solve(model)

    for r in model.RECIPES:
        used = sum(pyo.value(model.x[r, d]) for d in model.DAYS) > 1e-6
        assert (pyo.value(model.y[r]) > 0.5) == used


def test_higher_cost_weight_favors_cheaper_solution():
    cost_heavy = Weights(cost=0.9, variety=0.05, prep_time=0.05)
    model = build_model(RECIPES, num_days=3, nutrient_targets=TARGETS, weights=cost_heavy)
    solve(model)

    recipe_by_name = {r.name: r for r in RECIPES}
    total_cost = sum(
        recipe_by_name[r].cost * pyo.value(model.x[r, d]) for r in model.RECIPES for d in model.DAYS
    )
    # salmon_salad is the most expensive option; a cost-dominant objective should avoid it.
    salmon_servings = sum(pyo.value(model.x["salmon_salad", d]) for d in model.DAYS)
    assert salmon_servings == 0
    assert total_cost > 0


def test_objective_bounds_are_internally_consistent():
    weights = Weights(cost=0.34, variety=0.33, prep_time=0.33)
    model = build_model(RECIPES, num_days=3, nutrient_targets=TARGETS, weights=weights)
    bounds = model.objective_bounds

    # cost/prep_time are minimized: nadir (worst, from the other objectives' optima)
    # can never be better than ideal (best achievable for that objective alone).
    assert bounds["cost"].nadir >= bounds["cost"].ideal
    assert bounds["prep_time"].nadir >= bounds["prep_time"].ideal
    # variety is maximized: nadir (worst) can never exceed ideal (best achievable).
    assert bounds["variety"].nadir <= bounds["variety"].ideal


def test_normalized_objective_value_is_bounded():
    weights = Weights(cost=0.34, variety=0.33, prep_time=0.33)
    model = build_model(RECIPES, num_days=3, nutrient_targets=TARGETS, weights=weights)
    solve(model)

    # Each normalized term is designed to land roughly in [0, 1]; with weights summing
    # to 1 the combined objective should too, regardless of the raw $/minutes/count scales.
    assert -0.01 <= pyo.value(model.objective) <= 1.01


def test_higher_variety_weight_uses_more_distinct_recipes():
    variety_heavy = Weights(cost=0.05, variety=0.9, prep_time=0.05)
    model = build_model(RECIPES, num_days=3, nutrient_targets=TARGETS, weights=variety_heavy)
    solve(model)

    distinct_recipes_used = sum(1 for r in model.RECIPES if pyo.value(model.y[r]) > 0.5)
    # Regression test: _normalized()'s maximize branch had a sign bug that minimized
    # variety instead of maximizing it, so no matter how much weight variety got, the
    # solver always collapsed onto a single recipe.
    assert distinct_recipes_used >= 2


def test_degenerate_single_recipe_does_not_divide_by_zero():
    single_recipe = [Recipe(name="only_option", cost=2.0, prep_time_minutes=10, nutrients={"calories": 500})]
    targets = {"calories": NutrientTarget(minimum=500, maximum=500)}
    weights = Weights(cost=0.5, variety=0.25, prep_time=0.25)

    model = build_model(single_recipe, num_days=1, nutrient_targets=targets, weights=weights)
    result = solve(model)

    assert str(result.solver.termination_condition) == "optimal"
