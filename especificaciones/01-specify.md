# System Specification: AI-Assisted Nutrition and Grocery Management System

> **Fase SDD: Specify** — Define el *qué* y el *por qué* del sistema: alcance, módulos funcionales y el problema que resuelve, sin entrar todavía en decisiones técnicas de implementación. Sigue a `Constitution` ([00-constitution.md](00-constitution.md)) y es la base sobre la que se construyen `Plan` ([02-plan.md](02-plan.md)), `Tasks` ([03-tasks.md](03-tasks.md)) y `Validate` ([04-validate.md](04-validate.md)).

## Overview
This document specifies the architecture and functional requirements for the AI-assisted nutrition and grocery management platform.

## Key Modules
1. **User Profile & Preferences:** Manages user demographics, dietary goals, and interactive sliders for multi-objective optimization weighting (cost, variety, preparation time).
2. **Data Persistence Layer:** Integrates Supabase for storing nutritional data, user parameters, and recipe configurations.
3. **Frontend Application:** Built using React and Next.js, deployed via Vercel for dynamic and responsive user interaction.
4. **Perfil corporal y objetivo nutricional calculado:** la pantalla de "Objetivos nutricionales" (`frontend/src/app/targets/page.tsx`) le pedía directamente al usuario los rangos min/max de calorías/proteína/grasa/carbohidratos — un usuario común no tiene con qué criterio llenar eso. Se antepusieron dos pasos:
   1. **Perfil corporal:** peso, estatura y algunas medidas corporales, para calcular IMC y % de grasa estimado. Cada carga queda como una medición nueva en un historial (no pisa la anterior), con gráfica y tabla de esas métricas a lo largo del tiempo.
   2. **Objetivo genérico:** el usuario elige uno de unos pocos objetivos simples — mantener peso, bajar grasa, bajar peso, aumentar masa muscular (asumiendo que hay acompañamiento de entrenamiento aparte, no que la app lo provee).
   A partir del perfil corporal + el objetivo elegido, la app **precalcula** los rangos de macronutrientes (la misma UI de rangos min/max que ya existía) y los muestra ya diligenciados pero **inactivos/de solo lectura** por default (Mifflin-St Jeor + método Navy, ver [03-tasks.md](03-tasks.md) para el detalle de la fórmula). Un selector **Automático / Manual** controla esos rangos: en automático se calculan desde la última medición (cada vez que se guarda una medición nueva, la app pregunta si actualizarlos; "Sí" recalcula y deja automático, "No" no cambia nada); en manual el usuario los edita y las mediciones nuevas no los tocan.

5. **Dashboard: Planeación y Seguimiento.** Las pantallas sueltas (perfil corporal, objetivos, preferencias, recetas, plan, lista de compras) se enlazaban entre sí con filas de links y un usuario nuevo no sabía cuál era el siguiente paso. Se reorganizan en un dashboard (`/dashboard`) con dos fases:
   1. **Planeación** (se hace una vez por ciclo): perfil corporal → objetivos nutricionales → preferencias → generar plan.
   2. **Seguimiento diario** (el uso de todos los días): una línea de tiempo donde el **paso 0 son las compras** (botón "Hecho") y los pasos siguientes son los **días del plan**, cada uno con sus recetas. Se muestran pocos pasos a la vez y se puede navegar entre ellos. El sistema **recuerda** qué se preparó y cuándo: al abrir la app el usuario ve directamente lo que le toca hoy, y al marcarlo como hecho avanza al siguiente.
   Además, **asistente de primera visita**: después del login, si falta configurar algo, se guía al usuario paso a paso (perfil corporal → objetivos → preferencias → generar plan), con barra de progreso y un solo botón "Siguiente" por pantalla, en vez de dejarlo elegir entre muchos links.

   Decisiones tomadas (2026-09-25):
   - **El avance es por secuencia, no por calendario:** si un día no se cocina, al día siguiente sigue apareciendo el mismo paso. No se descuadra.
   - **Un paso de la línea de tiempo = un día del plan** (con todas sus recetas y porciones), no una receta suelta. Es lo más simple: el backend ya devuelve el plan agrupado así (`days: [{day, servings}]`), y cocinar por tandas queda cubierto porque las porciones del día ya vienen en el paso.
   - **Generar un plan nuevo reemplaza al activo** (el anterior queda guardado como histórico, no se borra).
   - **Cada receta muestra por ahora ingredientes y tiempo de preparación**; las recetas no tienen pasos de preparación cargados todavía.
   - **El asistente termina en "Generar plan"** y deja al usuario en Seguimiento con las compras como paso 0. Preferencias va en el asistente como paso opcional ("usar valores recomendados"), porque tiene defaults razonables.
   - **"Primera visita" se deduce de los datos, no de una marca aparte:** sin perfil corporal → paso 1; sin objetivos → paso 2; sin plan → paso 4. Si el usuario abandona a la mitad, retoma donde quedó.
