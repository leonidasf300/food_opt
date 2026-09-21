# Especificaciones — Metodología SDD (Spec-Driven Development)

Esta carpeta organiza la documentación del proyecto según las fases de **SDD (Spec-Driven Development)**: la especificación se escribe primero y guía el diseño técnico, el desglose de tareas y la validación, en lugar de escribirse después del código.

| # | Fase | Archivo | Estado |
|---|---|---|---|
| 0 | **Constitution** | [00-constitution.md](00-constitution.md) | ✅ Principios definidos (con puntos pendientes marcados) |
| 1 | **Specify** | [01-specify.md](01-specify.md) | ✅ Alcance funcional y módulos |
| 2 | **Plan** | [02-plan.md](02-plan.md) | ✅ Diseño técnico del modelo de optimización |
| 3 | **Tasks** | [03-tasks.md](03-tasks.md) | ✅ Desglose inicial propuesto, sin refinar/priorizar aún |
| 4 | **Validate** | [04-validate.md](04-validate.md) | ✅ Estrategia de testing y criterios de aceptación |
| — | **Implement** | *(no aplica todavía)* | ⏳ No hay código en el repo; empieza cuando se haga el scaffolding |

`Clarify` y `Analyze` son pasos livianos de SDD (resolver ambigüedades antes de planear, y chequear consistencia entre fases) que no requieren un documento propio en un proyecto de este tamaño; se hacen como revisión directa de los archivos existentes.

Cada archivo incluye al inicio una nota `Fase SDD` que explica su rol y enlaza a las fases vecinas.
