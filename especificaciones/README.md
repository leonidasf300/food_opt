# Especificaciones — Metodología SDD (Spec-Driven Development)

Esta carpeta organiza la documentación del proyecto según las fases de **SDD (Spec-Driven Development)**: la especificación se escribe primero y guía el diseño técnico y la validación, en lugar de escribirse después del código.

Fases adoptadas para este proyecto (el número de archivo indica el orden del flujo):

| Fase | Archivo | Objetivo |
|---|---|---|
| **Specify** | [01-specify.md](01-specify.md) | Qué se construye y por qué: alcance funcional y módulos del sistema. |
| **Plan** | [02-plan.md](02-plan.md) | Cómo se construye: diseño técnico del modelo de optimización que satisface la especificación. |
| **Validate** | [03-validate.md](03-validate.md) | Cómo se comprueba que lo construido cumple la especificación y el plan: estrategia de testing y criterios de aceptación. |

Cada archivo incluye al inicio una nota `Fase SDD` que explica su rol dentro de esta secuencia.

A medida que el proyecto avance, fases adicionales de SDD (p. ej. `Tasks`/desglose de trabajo, `Constitution`/principios del proyecto) pueden agregarse como nuevos archivos numerados en esta misma carpeta.
