# Data layer (Supabase)

Ver [`especificaciones/00-constitution.md`](../especificaciones/00-constitution.md) para la decisión de usar Supabase, y [`especificaciones/01-specify.md`](../especificaciones/01-specify.md) / [`especificaciones/02-plan.md`](../especificaciones/02-plan.md) para qué datos necesita el sistema.

## Local vs. cloud

Supabase es Postgres + Auth + una API REST/GraphQL autogenerada + RLS. **Local y cloud son el mismo Supabase corriendo en dos lados distintos**, y el puente entre ambos son las **migraciones** (`supabase/migrations/*.sql`), no los datos:

1. Se desarrolla y prueba el esquema en **local** (`supabase start`, corre todo en Docker).
2. Cuando está estable, se lo aplica al proyecto **cloud** (`supabase link` + `supabase db push`) — no existe todavía, se crea en supabase.com cuando estemos listos.
3. Los **datos** (snapshot de USDA, etc.) no viajan con las migraciones: son scripts de import aparte que se corren contra el destino que se elija (local primero para probar, cloud después) — ver [`scripts/README.md`](scripts/README.md). Corren con conexión directa a Postgres (no vía la API REST), así que las políticas RLS de solo-lectura sobre `ingredients`/`ingredient_nutrients` no les aplican.

## Setup local

Requiere Docker Desktop corriendo.

```
npx supabase start   # levanta el stack completo (primera vez descarga ~10 imágenes)
npx supabase stop    # lo apaga
npx supabase status  # URLs y keys del stack local, si ya está corriendo
```

**Nota Windows:** los puertos de Supabase se corrieron del rango default (54320-54329) al rango **58320-58329** en `config.toml`, porque Windows reserva dinámicamente 54318-54417 para Hyper-V/WSL y eso rompía el bind con un error de permisos (no de puerto ocupado). Si en otra máquina Windows da el mismo error, `netsh interface ipv4 show excludedportrange protocol=tcp` muestra qué rangos están reservados.

URLs locales (ver `npx supabase status` para las keys):
- Studio (UI para ver/editar datos): http://127.0.0.1:58323
- API: http://127.0.0.1:58321

## Esquema

Definido en [`migrations/20260921140828_create_core_schema.sql`](migrations/20260921140828_create_core_schema.sql):

| Tabla | Qué guarda |
|---|---|
| `profiles` | Extiende `auth.users` con datos del perfil |
| `preferences` | Pesos del slider (costo/variedad/tiempo, enteros que deben sumar 100) |
| `user_nutrient_targets` | Objetivos min/max por nutriente y usuario |
| `ingredients` | Nombre, fuente (usda/commercial_api/manual). Unidad de compra comercial y precio son nullable: llegan en una fase posterior (API comercial o curación manual), no junto con el dato nutricional de USDA |
| `ingredient_nutrients` | Nutrientes por cada 100 unidades base de un ingrediente |
| `recipes` | Nombre, tiempo de preparación, dueño (null = receta global) |
| `recipe_ingredients` | Relación receta → ingredientes con cantidad — habilita agregación de lista de compras trazable |

Todas las tablas tienen **RLS habilitado**: los datos personales (`profiles`, `preferences`, `user_nutrient_targets`) son visibles solo para su dueño; las tablas de referencia compartidas (`ingredients`, `ingredient_nutrients`, `recipes`, `recipe_ingredients`) son de lectura para cualquier usuario autenticado, y de escritura solo para el dueño de la fila (o vía `service_role` para los imports).

RLS por sí solo no alcanza: Postgres chequea privilegios a nivel de tabla *antes* de evaluar RLS, así que sin `GRANT` explícito da "permission denied" sin importar la política. Los proyectos nuevos de Supabase pueden auto-otorgar esto ("Automatically expose new tables" en el dashboard), pero Supabase mismo recomienda desactivarlo — por eso [`migrations/20260921161544_grant_table_privileges.sql`](migrations/20260921161544_grant_table_privileges.sql) otorga explícitamente los privilegios al rol `authenticated` (nada para `anon`: todo requiere login). Verificado en local contra la API REST real (no solo como superusuario): con `auto_expose_new_tables = false`, `anon` da 401, `authenticated` puede leer `ingredients` pero no escribirla (403), y puede escribir su propio `profiles`/`preferences`.

**Al crear el proyecto cloud, en la sección "Security" de la config inicial (Data API):** dejar "Enable Data API" y "Enable automatic RLS" activados, y **desactivar** "Automatically expose new tables" — coincide con lo que ya está probado acá.

## Workflow de migraciones

```
npx supabase migration new <nombre>   # crea un .sql vacío en supabase/migrations/
npx supabase db reset                 # reaplica todas las migraciones + seed desde cero (local)
```

## Import de datos

Ver [`scripts/README.md`](scripts/README.md) — script de import de USDA FoodData Central (`scripts/import_usda.py`), separado de las migraciones porque mueve datos, no esquema.

## Pendiente

Ver [`especificaciones/03-tasks.md`](../especificaciones/03-tasks.md): correr el import de USDA de verdad (falta API key personal), evaluación de APIs comerciales, y creación del proyecto cloud real cuando el equipo esté listo para eso.
