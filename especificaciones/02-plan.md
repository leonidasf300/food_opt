# Optimization Model Specification: Meal Planning

> **Fase SDD: Plan** — Define el *cómo*: traduce los requisitos funcionales de `Specify` ([01-specify.md](01-specify.md)) en el diseño técnico del modelo de optimización (función objetivo, restricciones, reglas de negocio). Sirve de contrato técnico para la implementación y para los criterios de `Validate` ([03-validate.md](03-validate.md)).

## Objective Function
The system utilizes a multi-objective optimization model combining:
* Minimization of total ingredient cost.
* Maximization of recipe and ingredient variety over the planning period.
* Minimization of total food preparation time.
* User-defined weighting using adjustable sliders that total 100% across objectives.

## Constraints
* **Nutritional Requirements:** Must meet daily and weekly micro and macronutrient targets.
* **Portion Scaling & Rounding:** Quantities are rounded to standard commercial purchasing units.
* **Shopping Aggregation:** Ingredient quantities across multiple recipes are aggregated to generate precise weekly shopping totals.