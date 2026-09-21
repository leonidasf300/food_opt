# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The `backend/` optimization module and the `supabase/` data layer schema have been scaffolded and are under active development. The frontend (Next.js) has not been started yet. There is no Supabase cloud project yet — only local dev via Docker (see `supabase/README.md`).

Specs live under `especificaciones/` following the **SDD (Spec-Driven Development)** methodology — see [`especificaciones/README.md`](especificaciones/README.md) for the full phase breakdown and [`especificaciones/03-tasks.md`](especificaciones/03-tasks.md) for what's done vs. pending:
- `especificaciones/00-constitution.md` — Constitution: non-negotiable project principles and resolved technical decisions (backend stack, data source, process)
- `especificaciones/01-specify.md` — Specify: system overview and functional modules
- `especificaciones/02-plan.md` — Plan: optimization model technical design
- `especificaciones/03-tasks.md` — Tasks: task breakdown with progress checkboxes
- `especificaciones/04-validate.md` — Validate: verification/testing plan

When adding new specs or docs, place them in `especificaciones/` and note which SDD phase they belong to.

## Commands

### Backend (`backend/`)

```
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows; use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt

python -m pytest -q             # run all tests
python -m pytest -q tests/test_model.py::test_solve_satisfies_nutrient_bounds_each_day  # single test
```

### Data layer (`supabase/`)

Requires Docker Desktop running.

```
npx supabase start              # boot the local stack (Postgres + Auth + REST + Studio, etc.)
npx supabase stop
npx supabase status             # local URLs/keys once running
npx supabase migration new <name>
npx supabase db reset           # reapply all migrations + seed from scratch, local only
```

Local ports are shifted to 58320-58329 (not the CLI's 54320-54329 default) — Windows dynamically reserves 54318-54417 for Hyper-V/WSL, which breaks binding in that range with a permissions error, not a port-in-use error. See `supabase/README.md` if this needs revisiting on another machine.

## Architecture

Planned as an AI-assisted nutrition and grocery management platform with three pieces (per `especificaciones/01-specify.md`):

- **Frontend** *(not started)*: React + Next.js, deployed on Vercel. User profile/preferences screen with sliders weighting the multi-objective optimization (cost, variety, prep time) that must sum to 100%.
- **Data layer** (`supabase/`, Postgres via Supabase): schema for profiles/preferences/nutrient targets/ingredients/recipes, RLS enabled on every table (see `supabase/README.md` for the table-by-table breakdown and access rules). No cloud project exists yet — schema is only verified against local Docker so far. Nutrition data will be sourced from a USDA FoodData Central snapshot, supplemented by commercial APIs and manual curation (see `especificaciones/00-constitution.md`); the import script itself isn't written yet.
- **Optimization backend** (`backend/`, Python + Pyomo + HiGHS): solves a weighted multi-objective model — minimize cost, minimize prep time, maximize recipe variety — subject to per-day nutrient constraints.
  - `backend/food_opt/model.py` — `Recipe`, `NutrientTarget`, `Weights` (validates weights sum to 1.0) dataclasses; `build_model()` constructs the Pyomo `ConcreteModel`; `solve()` runs it through the `appsi_highs` solver interface.
  - Recipe selection is modeled as `x[recipe, day]` (integer servings, bounded) plus a `y[recipe]` binary variety indicator, linked to actual usage via two constraints (`usage_upper_bound`, `usage_lower_bound`) rather than a naive count — this avoids the solver getting "free" variety credit for unused recipes.
  - Cost ($), prep time (minutes) and variety (recipe count) are on different scales, so `build_model()` normalizes them via a payoff table before weighting: it silently solves each objective alone first (`_payoff_table()`) to get each one's ideal/nadir bounds, exposed on the returned model as `model.objective_bounds`. This means every `build_model()` call does 4 solves total (3 for the payoff table + the real one) — fine for interactive use, worth knowing if it ever needs to run in a hot loop.
  - **Scope boundary**: shopping-list aggregation and rounding to commercial purchasing units are deferred until the data layer provides a recipe → ingredient breakdown (currently recipes only carry aggregate nutrient totals).
