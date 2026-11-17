# Correcciones de la revisión de código (2026-11-16)

**Fase SDD:** Validate — problemas encontrados revisando el repo completo, con su corrección y cómo se verificó cada una. Complementa a [`04-validate.md`](04-validate.md); el desglose de tareas sigue en [`03-tasks.md`](03-tasks.md).

Cinco problemas corregidos. Ninguno estaba en la lógica central del optimizador: todos estaban en los bordes entre capas (API ↔ solver, frontend ↔ API, frontend ↔ base de datos).

## Resumen

| # | Problema | Dónde se corrigió | Estado |
|---|----------|-------------------|--------|
| 1 | Un plan infactible devolvía 500 en vez de 422 | `backend/food_opt/model.py`, `api.py` | Verificado por HTTP |
| 2 | Vaciar el campo "Días" podía romper la pantalla de plan | `frontend/src/lib/planRequest.ts`, `PlanView.tsx` | Tests unitarios; falta probar en navegador |
| 3 | Editar una receta podía dejarla sin ingredientes | migración `save_recipe`, `recipes/page.tsx` | RPC verificado en base local; falta probar en navegador |
| 4 | El backend mezclaba recetas de todos los usuarios y las identificaba por nombre | `backend/food_opt/data.py`, `api.py`, `PlanView.tsx` | Verificado en base local |
| 5 | `minimum > maximum` en un objetivo devolvía 500 | `backend/food_opt/api.py` | Verificado por HTTP |

Tests después de los cambios: backend **24** (antes 15), frontend **47** (antes 42). Lint y typecheck del frontend limpios.

## 1. Plan infactible: 500 → 422

**Qué pasaba.** Con objetivos imposibles de cumplir, el solver lanzaba un `RuntimeError` genérico al intentar cargar una solución que no existía. Eso ocurría dentro de `_payoff_table()`, antes de que `api.py` llegara a mirar el estado del solver, así que la rama que devolvía 422 nunca se ejecutaba. El 500 resultante salía sin cabeceras CORS y el navegador lo trataba como fallo de red: el usuario veía "no se pudo conectar con el backend" cuando el backend sí estaba corriendo.

**Qué cambió.**
- `solve()` ahora resuelve con `load_solutions=False`, revisa el estado y solo entonces carga la solución. Si no hay solución lanza `InfeasiblePlanError` (nueva, subclase de `RuntimeError`).
- Cubre también el caso "se agotó el tiempo sin encontrar ninguna solución", que antes habría fallado igual.
- `create_plan()` captura `InfeasiblePlanError` alrededor de `build_model()` **y** `solve()` y responde 422 con un mensaje de texto.

**Verificación.** `POST /plans` con 90 000 kcal mínimas responde `422` con `access-control-allow-origin` presente. Tests: `test_infeasible_targets_return_422_not_500`, `test_infeasible_model_raises_a_specific_error`.

## 2. Campo "Días" vacío

**Qué pasaba.** `Number("")` es 0. El backend rechazaba el 0 con un 422 cuyo `detail` es una lista de objetos (formato de FastAPI para errores de validación). `PlanView` guardaba esa lista como mensaje de error y React no puede renderizar objetos.

**Qué cambió.** Nuevo módulo puro `frontend/src/lib/planRequest.ts`:
- `isValidNumDays()` valida entero entre 1 y 14 antes de llamar al backend; si falla se muestra el mensaje nuevo `plan.badDays` (ES/EN).
- `backendErrorText()` convierte cualquier `detail` (texto, lista de errores de validación, o forma inesperada) en un string o `null`. `PlanView` ya no pasa `detail` crudo a la pantalla.

**Verificación.** 5 tests nuevos en `planRequest.test.ts`. **No se probó en navegador**; el fallo original tampoco se reprodujo ahí, se dedujo del código.

## 3. Guardado de recetas atómico

**Qué pasaba.** Guardar una receta eran tres llamadas separadas: actualizar la receta, borrar todos sus `recipe_ingredients`, insertar los nuevos. Si la última fallaba, el borrado ya estaba hecho: al editar, la receta quedaba sin ingredientes; al crear, quedaba una receta huérfana. Bastaba elegir el mismo ingrediente en dos líneas, porque choca con la clave primaria `(recipe_id, ingredient_id)`.

**Qué cambió.**
- Migración nueva `supabase/migrations/20261116220000_save_recipe_rpc.sql`: función `save_recipe(p_recipe_id, p_name, p_prep_time_minutes, p_ingredients)`. Crea o edita la receta y reemplaza sus ingredientes en una sola transacción. `security invoker`, igual que `save_meal_plan`: se sigue aplicando RLS.
- La función rechaza listas de ingredientes vacías y ediciones de recetas ajenas o de muestra.
- `recipes/page.tsx` llama al RPC en vez de hacer las tres llamadas, y antes valida que no haya ingredientes repetidos (mensaje nuevo `recipes.duplicateIngredient`, ES/EN).

**Verificación.** Contra la base local, como usuario `authenticated`, en una transacción que se revirtió al final:

| Caso | Resultado |
|------|-----------|
| Crear con 2 ingredientes | correcto |
| Editar con ingrediente repetido | rechazado; nombre e ingredientes anteriores intactos |
| Crear con ingrediente repetido | rechazado; 0 recetas huérfanas |
| Lista de ingredientes vacía | rechazado |
| Editar una receta de muestra | rechazado (42501) |
| Editar la receta de otro usuario | rechazado (42501) |
| Edición válida | reemplaza los ingredientes |

**No se probó el formulario en navegador.**

## 4. Catálogo por usuario e ingredientes por id

**Qué pasaba.** `fetch_recipes()` traía las recetas de todos los usuarios, así que el plan de uno podía incluir recetas creadas por otro. Además `recipes.name` no es único y todo se identificaba por nombre: con dos recetas homónimas el modelo se quedaba con una sin avisar, y la lista de compras traía los ingredientes de las dos y contaba doble.

**Qué cambió.**
- `PlanRequest` acepta `user_id` (opcional). `fetch_recipes(user_id)` devuelve las recetas de muestra más las de ese usuario; sin `user_id`, solo las de muestra.
- La consulta usa `distinct on (name)`: si una receta del usuario se llama igual que una de muestra, gana la del usuario. Es la misma regla que ya aplicaba la pantalla "Hoy".
- `Recipe` lleva un campo `id` opcional. `fetch_recipe_ingredients()` recibe las recetas y busca por id, no por nombre.
- `PlanView` envía `user_id` en el pedido.

**Decisiones y límites.**
- `user_id` **no es autenticación**: el backend sigue sin verificar quién llama. Solo acota el catálogo. Es aceptable porque el backend es local y las recetas ya son legibles por cualquier usuario autenticado vía RLS. Si el backend se despliega, hay que validar el JWT de Supabase.
- Los planes siguen guardando **nombres** de recetas (`meal_plan_days.servings`). Pasar a ids implicaría cambiar la respuesta de la API, el esquema guardado y el seguimiento; quedó fuera de este cambio.
- No se agregó un índice único sobre `(created_by, name)`. Si un usuario crea dos recetas propias con el mismo nombre, el optimizador usa una sola (la elección es determinista, pero arbitraria).

**Verificación.** Contra la base local: 23 recetas, nombres únicos, todas con id. Con una receta de usuario homónima de una de muestra (en transacción revertida): para su dueño resuelve a la suya; para otro usuario y sin usuario, a la de muestra. Tests: `test_user_id_scopes_the_recipe_catalog`, `test_ingredients_are_looked_up_by_recipe_not_by_name`.

## 5. Rango de objetivo invertido

**Qué pasaba.** La base lo impide (`target_range_valid`), pero la API no validaba: `minimum > maximum` llegaba a Pyomo y fallaba con 500 al construir la restricción.

**Qué cambió.** `NutrientTargetIn` tiene un validador que rechaza `minimum > maximum`. `minimum == maximum` sigue permitido.

**Verificación.** `POST /plans` con 2000/1000 responde `422`. Tests: `test_inverted_target_range_is_rejected_at_validation`, `test_equal_min_and_max_is_allowed`.

## Archivos

**Nuevos**
- `backend/tests/test_api.py`
- `frontend/src/lib/planRequest.ts`, `frontend/src/lib/planRequest.test.ts`
- `supabase/migrations/20261116220000_save_recipe_rpc.sql`

**Modificados**
- `backend/food_opt/model.py`, `data.py`, `api.py`
- `frontend/src/app/dashboard/_views/PlanView.tsx`
- `frontend/src/app/dashboard/recipes/page.tsx`
- `frontend/src/lib/i18n/messages.ts`

## Pendiente

- **Nube:** la migración `save_recipe` está aplicada solo en local. Hasta hacer `db push`, crear o editar recetas en https://food-opt.vercel.app falla, porque el frontend nuevo llama a un RPC que allá no existe. Hay que subir la migración antes de (o junto con) desplegar el frontend.
- **Navegador:** probar a mano los puntos 2 y 3 (campo de días vacío; receta con ingrediente repetido).
- **No incluido** (punto 6 de la revisión): una receta cuyos ingredientes no tienen precio sigue rompiendo `fetch_recipes()` (`cost` nulo). Hoy no ocurre porque los 15 ingredientes tienen precio.
- Los tests de `test_api.py` llaman a `create_plan()` directamente con la base simulada, para no agregar `httpx` como dependencia. No cubren el enrutado HTTP; eso se verificó a mano con `curl`.
