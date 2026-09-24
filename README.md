# Food Opt

Plataforma de nutrición y compras asistida por IA: cada usuario define sus preferencias (costo / variedad / tiempo de preparación) y sus objetivos nutricionales diarios (a mano, o precalculados desde un perfil corporal), gestiona sus propias recetas, y genera un plan de comidas optimizado junto con la lista de compras correspondiente.

**Demo en producción:** [food-opt.vercel.app](https://food-opt.vercel.app) (login + preferencias + objetivos + recetas; la generación del plan necesita el backend corriendo en local, ver más abajo).

## Arquitectura

Tres piezas, cada una con su propio README:

- **[`frontend/`](frontend/)** — Next.js (App Router) + TypeScript + Tailwind, deployado en Vercel. Login por email/contraseña, sliders de preferencias, objetivos nutricionales (con precálculo desde un perfil corporal), CRUD de recetas propias, y la página de generación de plan con lista de compras.
- **[`backend/`](backend/README.md)** — Python + Pyomo + HiGHS. Resuelve un modelo multi-objetivo (minimizar costo, minimizar tiempo de preparación, maximizar variedad de recetas) sujeto a restricciones nutricionales diarias. Expuesto como una API HTTP local (`POST /plans`) — no deployada en ningún lado, corre solo para desarrollo.
- **[`supabase/`](supabase/README.md)** — Postgres vía Supabase (proyecto cloud `food-opt`). Esquema con RLS en cada tabla, ingredientes/nutrientes importados de USDA, precios reales de Colombia (exito.com, hand-curated), y 23 recetas de muestra.

El flujo completo (login → preferencias → objetivos → recetas → generar plan con lista de compras) está verificado a mano en un navegador real contra local; login → preferencias → guardar está verificado además contra producción.

## Documentación / especificaciones

El proyecto sigue **SDD (Spec-Driven Development)** — la especificación se escribe primero y guía el diseño técnico. Ver [`especificaciones/`](especificaciones/README.md):

- [`00-constitution.md`](especificaciones/00-constitution.md) — principios no negociables y decisiones técnicas resueltas (stack, fuente de datos, proceso)
- [`01-specify.md`](especificaciones/01-specify.md) — alcance funcional y módulos
- [`02-plan.md`](especificaciones/02-plan.md) — diseño técnico del modelo de optimización
- [`03-tasks.md`](especificaciones/03-tasks.md) — desglose de tareas, qué está hecho vs. pendiente, y los bugs reales encontrados probando el sistema (cada uno con su causa y su fix)
- [`04-validate.md`](especificaciones/04-validate.md) — plan de verificación/testing

## Quick start

Cada carpeta tiene su propio setup detallado (`backend/README.md`, `supabase/README.md`, `frontend/README.md` + este mismo archivo tiene los comandos completos en `CLAUDE.md`). En resumen, para correr todo en local:

```bash
# 1. Data layer (necesita Docker Desktop corriendo)
npx supabase start

# 2. Backend
cd backend
python -m venv .venv && .venv/Scripts/activate   # .venv/bin/activate en macOS/Linux
pip install -r requirements.txt
uvicorn food_opt.api:app --reload --port 8000

# 3. Frontend (otra terminal)
cd frontend
npm install
cp .env.local.example .env.local   # completar con `npx supabase status`
npm run dev                        # http://localhost:3000
```

Importar datos de ejemplo (ingredientes USDA, precios, recetas) está documentado en [`supabase/scripts/README.md`](supabase/scripts/README.md).

## Estado

Stack completo funcionando de punta a punta: frontend deployado, base de datos con esquema + datos reales pushed a cloud, backend probado localmente contra el flujo real. Pendientes principales: fuente de precios automatizada (por ahora son precios reales pero curados a mano, sin refresh), verificación del dominio de envío de email, y deploy del backend. Detalle completo en [`especificaciones/03-tasks.md`](especificaciones/03-tasks.md).
