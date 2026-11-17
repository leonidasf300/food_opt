"""Tests for the HTTP layer's own logic (validation + error mapping), with the DB
calls stubbed out. create_plan() is called directly rather than through FastAPI's
TestClient, which would need httpx as an extra dependency.
"""

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from food_opt import api
from food_opt.model import InfeasiblePlanError, NutrientTarget, Recipe, Weights, build_model
from food_opt.shopping_list import RecipeIngredient

RECIPES = [
    Recipe(id="id-chicken", name="chicken_rice", cost=3.0, prep_time_minutes=25, nutrients={"calories": 600}),
    Recipe(id="id-lentil", name="lentil_soup", cost=1.5, prep_time_minutes=15, nutrients={"calories": 400}),
]
WEIGHTS = {"cost": 0.4, "variety": 0.3, "prep_time": 0.3}
USER_ID = "11111111-1111-1111-1111-111111111111"


@pytest.fixture
def stub_db(monkeypatch):
    calls = {}

    def fake_fetch_recipes(user_id=None):
        calls["user_id"] = user_id
        return RECIPES

    def fake_fetch_recipe_ingredients(recipes):
        calls["ingredient_recipes"] = recipes
        return {
            r.name: [RecipeIngredient(f"{r.name} base", 100.0, "bolsa 500 g", 500.0, 2000.0)] for r in recipes
        }

    monkeypatch.setattr(api, "fetch_recipes", fake_fetch_recipes)
    monkeypatch.setattr(api, "fetch_recipe_ingredients", fake_fetch_recipe_ingredients)
    return calls


def _request(targets, **extra):
    return api.PlanRequest(num_days=2, nutrient_targets=targets, weights=WEIGHTS, **extra)


def test_feasible_plan_is_returned(stub_db):
    response = api.create_plan(_request({"calories": {"minimum": 1800, "maximum": 2200}}, user_id=USER_ID))

    assert response.status == "optimal"
    assert len(response.days) == 2
    for day in response.days:
        calories = sum({"chicken_rice": 600, "lentil_soup": 400}[name] * qty for name, qty in day.servings.items())
        assert 1800 <= calories <= 2200
    assert response.shopping_list


def test_user_id_scopes_the_recipe_catalog(stub_db):
    api.create_plan(_request({"calories": {"minimum": 1800, "maximum": 2200}}, user_id=USER_ID))
    assert stub_db["user_id"] == USER_ID

    api.create_plan(_request({"calories": {"minimum": 1800, "maximum": 2200}}))
    assert stub_db["user_id"] is None


def test_ingredients_are_looked_up_by_recipe_not_by_name(stub_db):
    response = api.create_plan(_request({"calories": {"minimum": 1800, "maximum": 2200}}))

    # The Recipe objects (carrying their DB ids) are passed on, not bare names.
    looked_up = stub_db["ingredient_recipes"]
    assert sorted(r.name for r in looked_up) == response.recipes_used
    assert all(r.id is not None for r in looked_up)


def test_infeasible_targets_return_422_not_500(stub_db):
    # 3 servings/day max of each recipe tops out at 3000 kcal -- 10000 can't be met.
    with pytest.raises(HTTPException) as excinfo:
        api.create_plan(_request({"calories": {"minimum": 10000, "maximum": 11000}}))

    assert excinfo.value.status_code == 422
    assert isinstance(excinfo.value.detail, str)


def test_infeasible_model_raises_a_specific_error():
    with pytest.raises(InfeasiblePlanError):
        build_model(
            RECIPES, 1, {"calories": NutrientTarget(10000, 11000)}, Weights(cost=0.4, variety=0.3, prep_time=0.3)
        )


def test_inverted_target_range_is_rejected_at_validation():
    with pytest.raises(ValidationError):
        _request({"calories": {"minimum": 2000, "maximum": 1000}})


def test_equal_min_and_max_is_allowed():
    _request({"calories": {"minimum": 2000, "maximum": 2000}})


@pytest.mark.parametrize("num_days", [0, 15])
def test_num_days_out_of_range_is_rejected(num_days):
    with pytest.raises(ValidationError):
        api.PlanRequest(
            num_days=num_days, nutrient_targets={"calories": {"minimum": 1, "maximum": 2}}, weights=WEIGHTS
        )
