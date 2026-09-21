"""HTTP API wrapping the optimization model, so the frontend can request a meal plan.

Local-only for now, not deployed anywhere:
    uvicorn food_opt.api:app --reload --port 8000
"""

from __future__ import annotations

import pyomo.environ as pyo
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .data import fetch_recipes
from .model import NutrientTarget, Weights, build_model, solve

app = FastAPI(title="Food Opt")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://food-opt.vercel.app"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class NutrientTargetIn(BaseModel):
    minimum: float
    maximum: float


class WeightsIn(BaseModel):
    cost: float
    variety: float
    prep_time: float


class PlanRequest(BaseModel):
    num_days: int = Field(gt=0, le=14)
    nutrient_targets: dict[str, NutrientTargetIn]
    weights: WeightsIn


class DayPlan(BaseModel):
    day: int
    servings: dict[str, int]


class PlanResponse(BaseModel):
    status: str
    total_cost: float
    total_prep_time_minutes: float
    recipes_used: list[str]
    days: list[DayPlan]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/plans", response_model=PlanResponse)
def create_plan(request: PlanRequest) -> PlanResponse:
    recipes = fetch_recipes()
    if not recipes:
        raise HTTPException(status_code=500, detail="No recipes available")

    try:
        weights = Weights(
            cost=request.weights.cost, variety=request.weights.variety, prep_time=request.weights.prep_time
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    nutrient_targets = {
        key: NutrientTarget(minimum=t.minimum, maximum=t.maximum) for key, t in request.nutrient_targets.items()
    }

    model = build_model(recipes, request.num_days, nutrient_targets, weights)
    result = solve(model)

    status = str(result.solver.termination_condition)
    if status != "optimal":
        raise HTTPException(status_code=422, detail=f"No feasible plan found (solver status: {status})")

    recipe_by_name = {r.name: r for r in recipes}
    days: list[DayPlan] = []
    total_cost = 0.0
    total_prep_time = 0.0
    used: set[str] = set()
    for d in model.DAYS:
        servings: dict[str, int] = {}
        for r in model.RECIPES:
            qty = round(pyo.value(model.x[r, d]))
            if qty > 0:
                servings[r] = qty
                used.add(r)
                total_cost += recipe_by_name[r].cost * qty
                total_prep_time += recipe_by_name[r].prep_time_minutes * qty
        days.append(DayPlan(day=d, servings=servings))

    return PlanResponse(
        status=status,
        total_cost=round(total_cost, 2),
        total_prep_time_minutes=total_prep_time,
        recipes_used=sorted(used),
        days=days,
    )
