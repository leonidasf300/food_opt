"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { DEFAULT_WEIGHTS } from "@/lib/preferences";
import { fetchActivePlan, saveActivePlan, type MealPlan, type PlanResponse } from "@/lib/mealPlan";
import { useDashboardUser } from "../UserContext";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:8000";

export function PlanView({ onSaved }: { onSaved?: () => void }) {
  const { id: userId } = useDashboardUser();
  const [numDays, setNumDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchActivePlan(userId)
      .then(setPlan)
      .catch((error: Error) => setErrorMessage(error.message));
  }, [userId]);

  async function handleGenerate() {
    const inProgress = plan && (plan.shopping_done_at || plan.meal_plan_days.some((day) => day.completed_at));
    if (inProgress && !window.confirm("Ya tenés un plan en curso. ¿Generar uno nuevo y reemplazarlo?")) return;

    setLoading(true);
    setErrorMessage(null);

    const [{ data: preferences, error: prefError }, { data: targets, error: targetsError }] = await Promise.all([
      supabase
        .from("preferences")
        .select("weight_cost, weight_variety, weight_prep_time")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("user_nutrient_targets").select("nutrient_key, minimum, maximum").eq("user_id", userId),
    ]);

    if (prefError) return fail(prefError.message);
    if (targetsError) return fail(targetsError.message);
    if (!targets || targets.length === 0) return fail("No hay objetivos nutricionales guardados todavía — cargalos primero.");

    // Preferences are optional: without saved ones the recommended defaults apply.
    const weights = preferences
      ? { cost: preferences.weight_cost, variety: preferences.weight_variety, prepTime: preferences.weight_prep_time }
      : DEFAULT_WEIGHTS;

    const nutrientTargets: Record<string, { minimum: number; maximum: number }> = {};
    for (const row of targets) {
      nutrientTargets[row.nutrient_key] = { minimum: row.minimum, maximum: row.maximum };
    }

    let body: PlanResponse;
    try {
      const response = await fetch(`${BACKEND_URL}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          num_days: numDays,
          nutrient_targets: nutrientTargets,
          weights: { cost: weights.cost / 100, variety: weights.variety / 100, prep_time: weights.prepTime / 100 },
        }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        return fail(errorBody?.detail ?? `Error del backend (HTTP ${response.status})`);
      }
      body = await response.json();
    } catch {
      return fail(`No se pudo conectar con el backend en ${BACKEND_URL}. ¿Está corriendo? (uvicorn food_opt.api:app --port 8000)`);
    }

    try {
      await saveActivePlan(body);
      setPlan(await fetchActivePlan(userId));
    } catch (error) {
      return fail((error as Error).message);
    }
    setLoading(false);
    onSaved?.();
  }

  function fail(message: string) {
    setErrorMessage(message);
    setLoading(false);
  }

  const distinctRecipes = plan ? new Set(plan.meal_plan_days.flatMap((day) => Object.keys(day.servings))).size : 0;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Generar plan</h1>
      <p className="text-sm text-gray-500">
        Usa tus objetivos y preferencias guardados para pedirle un plan al modelo de optimización. Generar uno nuevo
        reemplaza al plan activo (el anterior queda archivado).
      </p>

      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Días
          <input
            type="number"
            min={1}
            max={14}
            value={numDays}
            onChange={(event) => setNumDays(Number(event.target.value))}
            className="w-20 rounded border px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Generando..." : plan ? "Generar plan nuevo" : "Generar plan"}
        </button>
      </div>

      {errorMessage && <p className="text-red-600">{errorMessage}</p>}

      {plan && (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-gray-700">
            Plan activo del {new Date(plan.created_at).toLocaleDateString("es-CO")} · Costo total:{" "}
            <strong>${Number(plan.total_cost).toFixed(2)}</strong> · Tiempo total de preparación:{" "}
            <strong>{Number(plan.total_prep_time_minutes)} min</strong> · Recetas distintas: <strong>{distinctRecipes}</strong>
          </div>
          {plan.meal_plan_days.map((day) => (
            <div key={day.id} className="rounded border p-3">
              <div className="flex justify-between font-medium">
                <span>Día {day.day_index + 1}</span>
                {day.completed_at && <span className="text-sm font-normal text-green-600">Hecho</span>}
              </div>
              <ul className="mt-1 list-inside list-disc text-sm">
                {Object.entries(day.servings).map(([recipe, servings]) => (
                  <li key={recipe}>
                    {recipe} × {servings}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {!onSaved && (
            <Link href="/dashboard/today" className="underline">
              Ir al seguimiento de hoy →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
