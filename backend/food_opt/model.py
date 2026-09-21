"""Multi-objective meal-planning optimization model.

Implements the objective function and constraints described in
especificaciones/02-plan.md: a weighted combination of cost, variety
and preparation time, subject to per-day nutrient targets. Solved
with Pyomo + HiGHS (see especificaciones/00-constitution.md).

Scope of this first pass: recipe selection/servings per day and the
weighted objective + nutrient constraints only. Shopping-list
aggregation and rounding to commercial purchasing units (also
specified in 02-plan.md) need a recipe -> ingredient breakdown that
the data layer doesn't provide yet, so they're tracked as separate
tasks in especificaciones/03-tasks.md.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import pyomo.environ as pyo


@dataclass(frozen=True)
class Recipe:
    name: str
    cost: float
    prep_time_minutes: float
    nutrients: dict[str, float]


@dataclass(frozen=True)
class NutrientTarget:
    minimum: float
    maximum: float


@dataclass(frozen=True)
class Weights:
    """User-defined weighting for cost / variety / prep time, as fractions summing to 1.0 (100%)."""

    cost: float
    variety: float
    prep_time: float

    def __post_init__(self) -> None:
        total = self.cost + self.variety + self.prep_time
        if not math.isclose(total, 1.0, abs_tol=1e-6):
            raise ValueError(f"weights must sum to 1.0 (100%), got {total}")
        if min(self.cost, self.variety, self.prep_time) < 0:
            raise ValueError("weights must be non-negative")


def build_model(
    recipes: list[Recipe],
    num_days: int,
    nutrient_targets: dict[str, NutrientTarget],
    weights: Weights,
    max_servings_per_recipe_per_day: int = 3,
) -> pyo.ConcreteModel:
    """Build the Pyomo model for a given planning horizon.

    NOTE: cost ($), prep time (minutes) and variety (recipe count) are
    combined as a raw weighted sum despite living on different scales.
    Proper normalization is a known follow-up, not yet implemented
    (see especificaciones/03-tasks.md).
    """
    m = pyo.ConcreteModel()

    m.RECIPES = pyo.Set(initialize=[r.name for r in recipes])
    m.DAYS = pyo.RangeSet(0, num_days - 1)
    m.NUTRIENTS = pyo.Set(initialize=list(nutrient_targets.keys()))

    recipe_by_name = {r.name: r for r in recipes}

    m.x = pyo.Var(m.RECIPES, m.DAYS, domain=pyo.NonNegativeIntegers, bounds=(0, max_servings_per_recipe_per_day))
    m.y = pyo.Var(m.RECIPES, domain=pyo.Binary)

    # Link y[r] to actual usage of recipe r across the horizon.
    def _usage_upper_bound(m, r, d):
        return m.x[r, d] <= max_servings_per_recipe_per_day * m.y[r]

    m.usage_upper_bound = pyo.Constraint(m.RECIPES, m.DAYS, rule=_usage_upper_bound)

    def _usage_lower_bound(m, r):
        return sum(m.x[r, d] for d in m.DAYS) >= m.y[r]

    m.usage_lower_bound = pyo.Constraint(m.RECIPES, rule=_usage_lower_bound)

    def _nutrient_bounds(m, n, d):
        target = nutrient_targets[n]
        total = sum(recipe_by_name[r].nutrients.get(n, 0.0) * m.x[r, d] for r in m.RECIPES)
        return pyo.inequality(target.minimum, total, target.maximum)

    m.nutrient_bounds = pyo.Constraint(m.NUTRIENTS, m.DAYS, rule=_nutrient_bounds)

    def _objective(m):
        total_cost = sum(recipe_by_name[r].cost * m.x[r, d] for r in m.RECIPES for d in m.DAYS)
        total_prep_time = sum(recipe_by_name[r].prep_time_minutes * m.x[r, d] for r in m.RECIPES for d in m.DAYS)
        total_variety = sum(m.y[r] for r in m.RECIPES)
        return weights.cost * total_cost + weights.prep_time * total_prep_time - weights.variety * total_variety

    m.objective = pyo.Objective(rule=_objective, sense=pyo.minimize)

    return m


def solve(model: pyo.ConcreteModel) -> pyo.SolverResults:
    solver = pyo.SolverFactory("appsi_highs")
    return solver.solve(model)
