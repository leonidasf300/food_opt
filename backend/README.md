# Backend de optimización

Modelo de meal-planning multi-objetivo (Python + Pyomo + HiGHS). Ver [`especificaciones/02-plan.md`](../especificaciones/02-plan.md) para el diseño y [`especificaciones/00-constitution.md`](../especificaciones/00-constitution.md) para la elección de stack.

## Setup

```
python -m venv .venv
.venv/Scripts/activate          # Windows
pip install -r requirements.txt
```

## Tests

```
python -m pytest -q
```

## Estado

Implementado: función objetivo ponderada y normalizada (costo / variedad / tiempo de preparación) y restricciones de nutrientes por día (`food_opt/model.py`). La normalización usa el método de tabla de pagos: cada objetivo se resuelve solo primero para hallar su valor ideal y nadir, y con eso se escala a ~[0,1] antes de combinar con los pesos del usuario — evita que el objetivo en dólares domine sobre los objetivos en minutos/conteo de recetas solo por tener números más grandes.

Pendiente (ver [`especificaciones/03-tasks.md`](../especificaciones/03-tasks.md)):
- Redondeo a unidades de compra comercial y agregación de lista de compras semanal (requiere que la capa de datos exponga la relación receta → ingredientes).

Nota: las restricciones son solo diarias por decisión de equipo (no se permite compensar un día bajo con uno alto) — no es un gap pendiente, ver [`especificaciones/00-constitution.md`](../especificaciones/00-constitution.md).
