# Import scripts

## `import_usda.py`

Importa el snapshot inicial de ingredientes desde USDA FoodData Central (ver [`especificaciones/00-constitution.md`](../../especificaciones/00-constitution.md)). Llena `ingredients` + `ingredient_nutrients`; **no** llena precio/unidad de compra — eso viene después vía API comercial o curación manual, por eso esas columnas son nullable.

### Setup

```
cd supabase/scripts
python -m venv .venv
.venv/Scripts/activate          # Windows
pip install -r requirements.txt
```

### Requisitos

- Una API key personal de USDA FDC (gratis, alta instantánea en https://api.data.gov/signup/?key). El `DEMO_KEY` compartido tiene un rate limit muy bajo y no sirve para un import real — lo comprobamos en la práctica.
- El stack local de Supabase corriendo (`npx supabase start` desde la raíz del repo), o una `SUPABASE_DB_URL` apuntando a donde corresponda.

### Correr

Poné `USDA_API_KEY=...` en `supabase/scripts/.env` (copiá `.env.example`), o exportala en el shell:

```
USDA_API_KEY=tu_key python import_usda.py
```

Por default escribe contra Postgres local (`postgresql://postgres:postgres@127.0.0.1:58322/postgres`, el puerto shifteado — ver `supabase/README.md`). Para apuntar a otro destino: `SUPABASE_DB_URL=postgresql://... USDA_API_KEY=... python import_usda.py`.

**Para apuntar al proyecto cloud, usar el connection pooler, no el host directo:** `db.<ref>.supabase.co` solo resuelve a IPv6 en proyectos nuevos — si tu red no tiene salida IPv6 (común), la conexión falla con "failed to resolve host". El pooler sí resuelve a IPv4:

```
SUPABASE_DB_URL="postgresql://postgres.<ref>:<db-password>@aws-0-<region>.pooler.supabase.com:6543/postgres" USDA_API_KEY=... python import_usda.py
```

(`<region>` es la de tu proyecto, ej. `us-east-1`; se ve en Project Settings → Database → Connection string, opción "Transaction pooler").

Es **idempotente**: correrlo de nuevo actualiza los ingredientes existentes (matcheados por `source='usda'` + `external_id`=fdcId) en vez de duplicarlos.

### Qué importa

La lista está en [`seed_ingredients.py`](seed_ingredients.py) — 15 ingredientes comunes (proteínas, granos, vegetales, grasas), cada uno con su `fdcId` de USDA **pinneado explícitamente**, no resuelto por búsqueda de texto en tiempo de import. Motivo: la búsqueda por relevancia de FDC no es confiable para esto — en la primera corrida, "sweet potato, raw" matcheó primero con "Sweet Potato puffs, frozen" y "oats" con "Oil, oat". Para agregar un ingrediente nuevo: buscarlo en https://fdc.nal.usda.gov/food-search, verificar a mano que la descripción es la correcta, y pinnear ese `fdcId`.

No es un catálogo curado, es un punto de partida: extender la lista según haga falta.

### Estado

**Corrido contra local y contra el proyecto cloud real (`food-opt`): 15/15 ingredientes en ambos, verificado vía la API REST autenticada en los dos casos.**

**Nota sobre el pooler:** todos los scripts acá conectan con `prepare_threshold=None`. Sin eso, correr un script con suficientes ejecuciones repetidas del mismo `INSERT`/`UPDATE` contra el connection pooler de Supabase (modo transacción) revienta con `DuplicatePreparedStatement` — el pooler puede mandar cada query a un backend distinto, y las prepared statements de psycopg no sobreviven eso. Lo encontramos corriendo `import_recipes.py` contra cloud.

## `set_prices_co.py`

Completa `purchase_unit_label/size/price` de los 15 ingredientes de USDA con **precios reales de Colombia** — leídos a mano de exito.com el 2026-09-22 (no vía API: DANE SIPSA y DANE IPC se investigaron primero como fuente real y ambos se descartaron, ver [`especificaciones/00-constitution.md`](../../especificaciones/00-constitution.md)). Es una foto fija curada a mano, no un feed que se actualiza solo — sin proceso de refresco todavía, se va a desactualizar. `purchase_unit_size`/`purchase_unit_label` son la presentación comercial real (ej. "Bolsa 5000 g", "Cubeta x30 huevos") para que `shopping_list.py` redondee a unidades que de verdad se compran, no a kilos abstractos. Dos precios son estimados, no leídos directo, porque exito.com los vende por unidad en vez de por peso: huevo ($550/huevo, asumiendo 50 g/huevo) y batata ($1.358/unidad, asumiendo ~150 g/unidad) — el de la batata es el más flojo de los 15. `purchase_unit_size` está en gramos, igual que `ingredient_nutrients.amount_per_100_units` (USDA reporta por masa incluso para líquidos como leche/aceite, no por volumen) — mantener esa consistencia importa para que el costo por porción salga bien calculado.

```
python set_prices_co.py
```

Correr **después** de `import_usda.py` (necesita que los ingredientes ya existan) — por eso es un script, no una migración: una migración correría antes de que el import cree las filas y no actualizaría nada. Corrido contra **cloud** el 2026-09-22 (15/15 ingredientes, verificado con una query directa) — pendiente correrlo también contra local la próxima vez que Docker esté levantado.

## `import_recipes.py`

Importa las recetas base de [`seed_recipes.py`](seed_recipes.py) (23 recetas, combinaciones de los 15 ingredientes — suficiente variedad para ~4 semanas de planes sin repetir demasiado) y después imprime el costo/nutrientes agregados de cada una para poder verificarlos a mano contra la vista `recipe_totals`. Correr después de `import_usda.py` y `set_placeholder_prices.py`. Idempotente (upsert por nombre entre recetas globales), así que correrlo de nuevo tras agregar recetas a `seed_recipes.py` es seguro.

```
python import_recipes.py
```

Idempotente: re-correrlo borra y vuelve a crear las recetas que matchean por nombre (entre las recetas globales, `created_by is null`), no las duplica.
