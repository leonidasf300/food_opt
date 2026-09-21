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

## API local

```
uvicorn food_opt.api:app --reload --port 8000
```

`POST /plans` — recibe `{num_days, nutrient_targets, weights}`, trae las recetas desde la vista `recipe_totals` de Supabase (`food_opt/data.py`, usa `SUPABASE_DB_URL`/default local), corre el solver y devuelve el plan junto con una lista de compras (`food_opt/shopping_list.py`: cantidad necesaria de cada ingrediente sumada entre todas las recetas/porciones del plan, redondeada hacia arriba a unidades de compra comercial, con su costo). No deployado en ningún lado — solo para desarrollo local; el frontend le pega vía `NEXT_PUBLIC_BACKEND_API_URL`.

## Estado

Implementado: función objetivo ponderada y normalizada (costo / variedad / tiempo de preparación) y restricciones de nutrientes por día (`food_opt/model.py`). La normalización usa el método de tabla de pagos: cada objetivo se resuelve solo primero para hallar su valor ideal y nadir, y con eso se escala a ~[0,1] antes de combinar con los pesos del usuario — evita que el objetivo en dólares domine sobre los objetivos en minutos/conteo de recetas solo por tener números más grandes.

**Bug real que tuvo esto roto un rato:** la rama de normalización para objetivos a maximizar (variedad) tenía el signo invertido — subir el peso de variedad literalmente empujaba la variedad para abajo, no para arriba. Se encontró probando la API real con distintos pesos, no por inspección del código (los tests de esa época solo chequeaban límites, no dirección). Fix + test de regresión en `test_higher_variety_weight_uses_more_distinct_recipes`. Detalle en [issue #2](https://github.com/leonidasf300/food_opt/issues/2) (cerrado).

También implementado: lista de compras (`food_opt/shopping_list.py`, módulo puro sin DB, tests en `tests/test_shopping_list.py`). `build_shopping_list()` suma la cantidad necesaria de cada ingrediente entre todas las recetas y porciones del plan, y redondea hacia arriba a unidades de compra comercial (`math.ceil(cantidad / purchase_unit_size)`) para calcular cuántas unidades comprar y su costo. Ingredientes sin `purchase_unit_size`/`price` cargado (la mayoría más allá de los 15 importados de USDA) reportan la cantidad cruda con `units_to_buy`/`cost` en `null`, no un valor inventado. Verificado a mano contra la API real (frijoles negros: 480g → 2 bolsas → $3.60; arroz blanco: 600g → 1 bolsa → $2.50) y contra el flujo E2E completo en el navegador.

Pendiente (ver [`especificaciones/03-tasks.md`](../especificaciones/03-tasks.md)): ninguno en esta sección — quedan pendientes fuera del backend (fuente de precios real, CRUD de recetas, deploy del backend, tests de integración automatizados).

Nota: las restricciones son solo diarias por decisión de equipo (no se permite compensar un día bajo con uno alto) — no es un gap pendiente, ver [`especificaciones/00-constitution.md`](../especificaciones/00-constitution.md).
