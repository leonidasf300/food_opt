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
   A partir del perfil corporal + el objetivo elegido, la app **precalcula** los rangos de macronutrientes (la misma UI de rangos min/max que ya existía) y los muestra ya diligenciados pero **inactivos/de solo lectura** por default (Mifflin-St Jeor + método Navy, ver [03-tasks.md](03-tasks.md) para el detalle de la fórmula). Un botón "Personalizar" desbloquea la edición manual de esos rangos, para el usuario que sí quiera ajustarlos a mano.