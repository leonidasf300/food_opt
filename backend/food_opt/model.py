"""Multi-objective meal-planning optimization model.

Implements the objective function and constraints described in
especificaciones/02-plan.md: a weighted combination of cost, variety
and preparation time, subject to per-day nutrient targets. Solved
with Pyomo + HiGHS (see especificaciones/00-constitution.md).

Cost ($), prep time (minutes) and variety (recipe count) live on
different scales, so they're normalized with the payoff-table method
(Marler & Arora, 2010) before being combined: each objective is
solved on its own first to find its ideal value (best possible) and
its nadir value (worst value it takes at the other objectives'
optima), then scaled to roughly [0, 1] before weighting.

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


@dataclass(frozen=True)
class ObjectiveBounds:
    """Ideal (best possible) and nadir (worst-at-other-optima) value for one objective."""

    ideal: float
    nadir: float


def _base_model(
    recipes: list[Recipe],
    num_days: int,
    nutrient_targets: dict[str, NutrientTarget],
    max_servings_per_recipe_per_day: int,
) -> tuple[pyo.ConcreteModel, dict[str, Recipe]]:
    """Sets, variables and constraints shared by every single- or multi-objective solve."""
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

    return m, recipe_by_name


def _total_cost_expr(m: pyo.ConcreteModel, recipe_by_name: dict[str, Recipe]):
    return sum(recipe_by_name[r].cost * m.x[r, d] for r in m.RECIPES for d in m.DAYS)


def _total_prep_time_expr(m: pyo.ConcreteModel, recipe_by_name: dict[str, Recipe]):
    return sum(recipe_by_name[r].prep_time_minutes * m.x[r, d] for r in m.RECIPES for d in m.DAYS)


def _total_variety_expr(m: pyo.ConcreteModel):
    return sum(m.y[r] for r in m.RECIPES)


def solve(model: pyo.ConcreteModel) -> pyo.SolverResults:
    solver = pyo.SolverFactory("appsi_highs")
    return solver.solve(model)


def _payoff_table(
    recipes: list[Recipe],
    num_days: int,
    nutrient_targets: dict[str, NutrientTarget],
    max_servings_per_recipe_per_day: int,
) -> dict[str, ObjectiveBounds]:
    """Solve each objective alone to build the ideal/nadir bounds used to normalize them."""
    rows = []
    for key, sense in [("cost", pyo.minimize), ("prep_time", pyo.minimize), ("variety", pyo.maximize)]:
        m, recipe_by_name = _base_model(recipes, num_days, nutrient_targets, max_servings_per_recipe_per_day)
        expr = {
            "cost": _total_cost_expr(m, recipe_by_name),
            "prep_time": _total_prep_time_expr(m, recipe_by_name),
            "variety": _total_variety_expr(m),
        }[key]
        m.objective = pyo.Objective(expr=expr, sense=sense)
        result = solve(m)
        if str(result.solver.termination_condition) != "optimal":
            raise RuntimeError(f"payoff-table sub-problem for '{key}' did not solve to optimality")
        rows.append(
            {
                "cost": pyo.value(_total_cost_expr(m, recipe_by_name)),
                "prep_time": pyo.value(_total_prep_time_expr(m, recipe_by_name)),
                "variety": pyo.value(_total_variety_expr(m)),
            }
        )
    cost_row, time_row, variety_row = rows
    return {
        "cost": ObjectiveBounds(ideal=cost_row["cost"], nadir=max(time_row["cost"], variety_row["cost"])),
        "prep_time": ObjectiveBounds(
            ideal=time_row["prep_time"], nadir=max(cost_row["prep_time"], variety_row["prep_time"])
        ),
        "variety": ObjectiveBounds(
            ideal=variety_row["variety"], nadir=min(cost_row["variety"], time_row["variety"])
        ),
    }


def _normalized(expr, bounds: ObjectiveBounds, maximize: bool = False):
    span = bounds.nadir - bounds.ideal
    if abs(span) < 1e-9:
        # Objective doesn't vary across the individual optima (e.g. only one feasible
        # solution) -- it can't discriminate between plans, so it drops out of the sum.
        return 0
    if maximize:
        return (bounds.nadir - expr) / span
    return (expr - bounds.ideal) / span


def build_model(
    recipes: list[Recipe],
    num_days: int,
    nutrient_targets: dict[str, NutrientTarget],
    weights: Weights,
    max_servings_per_recipe_per_day: int = 3,
) -> pyo.ConcreteModel:
    """Build the Pyomo model for a given planning horizon, with normalized objectives."""
    bounds = _payoff_table(recipes, num_days, nutrient_targets, max_servings_per_recipe_per_day)
    m, recipe_by_name = _base_model(recipes, num_days, nutrient_targets, max_servings_per_recipe_per_day)

    def _objective(m):
        cost_n = _normalized(_total_cost_expr(m, recipe_by_name), bounds["cost"])
        time_n = _normalized(_total_prep_time_expr(m, recipe_by_name), bounds["prep_time"])
        variety_n = _normalized(_total_variety_expr(m), bounds["variety"], maximize=True)
        return weights.cost * cost_n + weights.prep_time * time_n + weights.variety * variety_n

    m.objective = pyo.Objective(rule=_objective, sense=pyo.minimize)
    m.objective_bounds = bounds  # exposed for tests/debugging, not part of the Pyomo model

    return m
