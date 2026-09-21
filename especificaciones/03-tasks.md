# Task Breakdown: Initial Implementation

> **Fase SDD: Tasks** — Traduce `Plan` ([02-plan.md](02-plan.md)) en tareas concretas y accionables, listas para pasar a `Implement` (el código, que todavía no existe en este repo) y verificarse en `Validate` ([04-validate.md](04-validate.md)). Es un desglose propuesto, no un compromiso de alcance: se debe revisar y refinar antes de empezar a programar.

## Frontend (Next.js / React)
- [ ] Scaffold de la app Next.js.
- [ ] Pantalla de perfil/preferencias con sliders de ponderación (costo / variedad / tiempo de preparación) que sumen 100%.
- [ ] Integración con Supabase (auth + queries) desde el frontend.

## Data layer (Supabase)
- [ ] Esquema: usuarios, preferencias, recetas, ingredientes, valores nutricionales.
- [ ] Políticas de acceso (RLS) para datos de usuario.
- [ ] Importar snapshot inicial de USDA FoodData Central a Supabase.
- [ ] Evaluar APIs comerciales (Edamam/Nutritionix) para cubrir productos de marca faltantes en el snapshot de USDA.
- [ ] Definir proceso de curación manual para huecos restantes (ingredientes sin match en ninguna fuente).

## Backend de optimización
- [ ] Setup del proyecto Python con Pyomo + HiGHS (ver [00-constitution.md](00-constitution.md)).
- [ ] Implementar función objetivo multi-criterio (costo, variedad, tiempo).
- [ ] Implementar restricciones nutricionales (macro/micro diarios y semanales).
- [ ] Implementar redondeo a unidades de compra comercial.
- [ ] Implementar agregación de lista de compras semanal.

## Testing (según 04-validate.md)
- [ ] Unit tests: sumas nutricionales, minimización de costo, lógica de redondeo.
- [ ] Integration tests: Supabase ↔ backend de optimización.
- [ ] E2E tests: flujo completo preferencias → plan de comidas → lista de compras.
