# Project Constitution: AI-Assisted Nutrition and Grocery Management System

> **Fase SDD: Constitution** — Principios no negociables que rigen el resto de las fases (`Specify` → [01-specify.md](01-specify.md), `Plan` → [02-plan.md](02-plan.md), `Tasks` → [03-tasks.md](03-tasks.md), `Validate` → [04-validate.md](04-validate.md)). Cualquier decisión posterior que contradiga estos principios debe justificarse explícitamente o revisarse aquí primero.

## Principios

1. **Spec-first:** ningún módulo se implementa sin una especificación (`Specify`) y un plan técnico (`Plan`) aprobados para esa parte del sistema.
2. **Corrección matemática no negociable:** toda suma nutricional, minimización de costo y lógica de redondeo debe ser verificable por tests unitarios antes de considerarse completa (ver [04-validate.md](04-validate.md)).
3. **Control explícito del usuario:** los pesos del modelo multi-objetivo (costo, variedad, tiempo de preparación) siempre deben ser ajustables por el usuario y sumar 100% (ver [02-plan.md](02-plan.md)).
4. **Trazabilidad de datos:** toda cantidad de ingrediente mostrada en la lista de compras debe ser reconstruible a partir de las recetas y porciones que la originaron (agregación auditable).

## Pendiente de definición

Estos puntos son parte habitual de una Constitution SDD pero todavía no están decididos por el equipo — no se completan aquí para no inventar información:

- Stack y versiones exactas del backend de optimización (los specs solo mencionan "Python" en el plan de testing, sin confirmarlo como decisión).
- Estándares de estilo de código y proceso de revisión (PRs, linters, CI).
- Política de versionado de datos nutricionales (fuente de la base de datos de alimentos).
