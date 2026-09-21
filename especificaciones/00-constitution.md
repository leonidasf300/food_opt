# Project Constitution: AI-Assisted Nutrition and Grocery Management System

> **Fase SDD: Constitution** — Principios no negociables que rigen el resto de las fases (`Specify` → [01-specify.md](01-specify.md), `Plan` → [02-plan.md](02-plan.md), `Tasks` → [03-tasks.md](03-tasks.md), `Validate` → [04-validate.md](04-validate.md)). Cualquier decisión posterior que contradiga estos principios debe justificarse explícitamente o revisarse aquí primero.

## Principios

1. **Spec-first:** ningún módulo se implementa sin una especificación (`Specify`) y un plan técnico (`Plan`) aprobados para esa parte del sistema.
2. **Corrección matemática no negociable:** toda suma nutricional, minimización de costo y lógica de redondeo debe ser verificable por tests unitarios antes de considerarse completa (ver [04-validate.md](04-validate.md)).
3. **Control explícito del usuario:** los pesos del modelo multi-objetivo (costo, variedad, tiempo de preparación) siempre deben ser ajustables por el usuario y sumar 100% (ver [02-plan.md](02-plan.md)).
4. **Trazabilidad de datos:** toda cantidad de ingrediente mostrada en la lista de compras debe ser reconstruible a partir de las recetas y porciones que la originaron (agregación auditable).

## Decisiones técnicas

- **Backend de optimización:** Python + [Pyomo](http://www.pyomo.org/) como modelador, resuelto con **HiGHS** (solver LP/MIP libre, licencia MIT).
- **Proceso/CI:** sin linters, CI ni revisión obligatoria de PRs por ahora; se define cuando el volumen de código lo justifique. Se commitea directo a `main`.
- **Datos nutricionales:** base inicial importada como *snapshot* (no consultada en vivo) desde **USDA FoodData Central**, completada con APIs comerciales (Edamam/Nutritionix) para productos de marca faltantes, y curación manual para huecos restantes. Ver tarea de importación en [03-tasks.md](03-tasks.md).
- **Horizonte de restricciones nutricionales:** solo diario, sin restricción agregada semanal (no se permite compensar un día bajo con uno alto). Ver [02-plan.md](02-plan.md).
