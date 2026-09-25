# Levantar todo en local

Tres piezas independientes, tres terminales, en este orden.

## 1. Docker Desktop
Abrilo y esperá a que el ícono de la ballena deje de animarse.

## 2. Supabase local (necesita Docker arriba)
```bash
cd C:\Users\ASUS\CodingProjects\Food_opt
npx supabase start
```
Chequear estado en cualquier momento: `npx supabase status`.

## 3. Backend (necesita Supabase arriba)
```bash
cd C:\Users\ASUS\CodingProjects\Food_opt\backend
.venv/Scripts/activate
uvicorn food_opt.api:app --reload --port 8000
```
Listo cuando dice `Application startup complete`.

## 4. Frontend (en paralelo al backend)
```bash
cd C:\Users\ASUS\CodingProjects\Food_opt\frontend
npm run dev
```
Abrir **`http://localhost:3000`** (nunca `127.0.0.1`, rompe la hidratación — ver `CLAUDE.md`).

## Apagar todo
- Backend y frontend: `Ctrl+C` en cada terminal.
- Supabase: `npx supabase stop`.
- Docker Desktop: cerrarlo si no lo vas a usar pronto.
