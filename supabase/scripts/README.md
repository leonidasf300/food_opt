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

```
USDA_API_KEY=tu_key python import_usda.py
```

Por default escribe contra Postgres local (`postgresql://postgres:postgres@127.0.0.1:58322/postgres`, el puerto shifteado — ver `supabase/README.md`). Para apuntar a otro destino: `SUPABASE_DB_URL=postgresql://... USDA_API_KEY=... python import_usda.py`.

Es **idempotente**: correrlo de nuevo actualiza los ingredientes existentes (matcheados por `source='usda'` + `external_id`=fdcId) en vez de duplicarlos.

### Qué importa

La lista inicial está en [`seed_ingredients.py`](seed_ingredients.py) — ~15 ingredientes comunes (proteínas, granos, vegetales, grasas) para tener datos reales con qué construir/probar recetas. No es un catálogo curado, es un punto de partida: extender esa lista según haga falta.

### Estado

Lógica de upsert (idempotencia, mapeo de nutrientes) verificada contra Postgres local con datos de prueba. **La corrida real contra la API de USDA está pendiente** de una API key personal — ver [`especificaciones/03-tasks.md`](../../especificaciones/03-tasks.md).
