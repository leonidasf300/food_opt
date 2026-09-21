# Task Breakdown: Initial Implementation

> **Fase SDD: Tasks** — Traduce `Plan` ([02-plan.md](02-plan.md)) en tareas concretas y accionables, listas para pasar a `Implement` (el código, que todavía no existe en este repo) y verificarse en `Validate` ([04-validate.md](04-validate.md)). Es un desglose propuesto, no un compromiso de alcance: se debe revisar y refinar antes de empezar a programar.

## Frontend (Next.js / React)
- [x] Scaffold de la app Next.js — `frontend/` (TypeScript, App Router, Tailwind).
- [x] Pantalla de perfil/preferencias con sliders de ponderación (costo / variedad / tiempo de preparación) que sumen 100% — `frontend/src/app/preferences/page.tsx`. Los sliders redistribuyen proporcionalmente para garantizar suma exacta de 100 (`frontend/src/lib/preferences.ts`, con tests).
- [x] Integración con Supabase (auth + queries) desde el frontend — `frontend/src/lib/supabase/client.ts`; auth por magic link, lee/escribe la tabla `preferences`.
- [ ] Probar la interacción real en navegador (sliders, magic link, guardado) — validado por build/lint/tests + smoke test HTTP, pero no de forma visual/interactiva (sin extensión de browser conectada en esta sesión).

## Data layer (Supabase)
- [x] Esquema: usuarios, preferencias, recetas, ingredientes, valores nutricionales — `supabase/migrations/20260921140828_create_core_schema.sql`. Verificado corriendo local (Docker), ver `supabase/README.md`.
- [x] Políticas de acceso (RLS) para datos de usuario — mismo archivo de migración.
- [ ] Crear proyecto Supabase cloud real y hacer `supabase db push` cuando el equipo esté listo.
- [ ] Importar snapshot inicial de USDA FoodData Central a Supabase.
- [ ] Evaluar APIs comerciales (Edamam/Nutritionix) para cubrir productos de marca faltantes en el snapshot de USDA.
- [ ] Definir proceso de curación manual para huecos restantes (ingredientes sin match en ninguna fuente).

## Backend de optimización
- [x] Setup del proyecto Python con Pyomo + HiGHS (ver [00-constitution.md](00-constitution.md)) — `backend/`.
- [x] Implementar función objetivo multi-criterio (costo, variedad, tiempo) — `backend/food_opt/model.py`.
- [x] Implementar restricciones nutricionales diarias (macro/micro). Decisión: sin horizonte semanal, ver [00-constitution.md](00-constitution.md).
- [x] Normalizar los tres objetivos antes de combinarlos — método de tabla de pagos (payoff table / Marler & Arora), `backend/food_opt/model.py`.
- [ ] Implementar redondeo a unidades de compra comercial.
- [ ] Implementar agregación de lista de compras semanal (requiere receta → ingredientes desde la capa de datos).

## Testing (según 04-validate.md)
- [x] Unit tests del modelo: cumplimiento de restricciones nutricionales, indicador de variedad, sensibilidad al peso de costo, consistencia y acotamiento de la normalización — `backend/tests/test_model.py`.
- [ ] Unit tests: lógica de redondeo (pendiente de implementar el redondeo mismo).
- [ ] Integration tests: Supabase ↔ backend de optimización.
- [ ] E2E tests: flujo completo preferencias → plan de comidas → lista de compras.
