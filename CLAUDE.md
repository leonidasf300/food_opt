# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository currently contains only specification documents — no source code, package manifests, or build tooling exist yet. There are no build/lint/test commands to run because nothing has been scaffolded. When code is added, this file should be updated with the actual commands (e.g. `npm run build`, `pytest`, etc.) and verified architecture.

Specs are organized under `especificaciones/` following the **SDD (Spec-Driven Development)** methodology — see [`especificaciones/README.md`](especificaciones/README.md) for the phase breakdown:
- `especificaciones/01-specify.md` — Specify phase: system overview and functional modules
- `especificaciones/02-plan.md` — Plan phase: optimization model technical design
- `especificaciones/03-validate.md` — Validate phase: verification/testing plan

When adding new specs or docs, place them in `especificaciones/` and note which SDD phase they belong to.

## Intended architecture (per specs, not yet implemented)

This is planned as an AI-assisted nutrition and grocery management platform with three main pieces:

- **Frontend**: React + Next.js, deployed on Vercel. Handles user profile/preferences, including sliders for weighting a multi-objective optimization (cost, variety, prep time) that must sum to 100%.
- **Data layer**: Supabase, storing nutritional data, user parameters, and recipe configurations.
- **Optimization backend** (language unspecified in current docs, referred to as "the Python optimization backend" in the verification plan): solves a multi-objective model that:
  - Minimizes total ingredient cost.
  - Maximizes recipe/ingredient variety over the planning period.
  - Minimizes total food preparation time.
  - Is constrained by daily/weekly macro and micronutrient targets.
  - Rounds portions to standard commercial purchasing units.
  - Aggregates ingredient quantities across recipes into a weekly shopping list.

## Testing plan (per specs, not yet implemented)

Three verification layers are specified:
1. **Unit tests** for backend math: nutrient sum totals, cost minimization, rounding logic.
2. **Integration tests** between Supabase and the optimization backend.
3. **End-to-end tests** covering the full flow from adjusting preferences in the Next.js UI to generating the final meal plan and shopping list.

Key correctness properties to validate when tests are written: aggregate macro/micronutrient sums across selected recipes must satisfy target constraints, and ingredient aggregation across multiple recipe occurrences (e.g. same ingredient on separate days) must be accurate.
