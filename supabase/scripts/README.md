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
