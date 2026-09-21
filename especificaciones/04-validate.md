# Verification and Testing Plan

> **Fase SDD: Validate** — Última fase de esta carpeta: define cómo se comprueba que lo implementado (fuera de `especificaciones/`, todavía sin empezar) cumple lo especificado en `Specify` ([01-specify.md](01-specify.md)), `Plan` ([02-plan.md](02-plan.md)) y `Tasks` ([03-tasks.md](03-tasks.md)) — estrategia de testing por capas y criterios de validación matemática/funcional que la implementación debe satisfacer antes de darse por completa.

## Verification Layers
1. **Unit Testing:** Validates backend mathematical calculations for nutrient sum totals, cost minimization, and rounding logic.
2. **Integration Testing:** Ensures correct communication between Supabase database instances and the Python optimization backend.
3. **End-to-End (E2E) Testing:** Verifies the complete user flow from preference adjustment in the Next.js interface to the generation of the final meal plan and shopping list.

## Mathematical Validation
* Verifies that the aggregate sum of macro and micronutrients across all selected recipes satisfies target constraints.
* Confirms accurate aggregation of ingredient amounts for weekly grocery lists (e.g., combining multiple occurrences of an ingredient across separate recipe days).