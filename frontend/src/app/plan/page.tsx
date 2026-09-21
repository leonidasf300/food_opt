"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:8000";

type DayPlan = { day: number; servings: Record<string, number> };
type PlanResponse = {
  status: string;
  total_cost: number;
  total_prep_time_minutes: number;
  recipes_used: string[];
  days: DayPlan[];
};

export default function PlanPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [numDays, setNumDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  async function handleGenerate() {
    if (!userId) return;
    setLoading(true);
    setErrorMessage(null);
    setPlan(null);

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
    if (!preferences) return fail("No hay preferencias guardadas todavía — cargalas primero.");
    if (!targets || targets.length === 0) return fail("No hay objetivos nutricionales guardados todavía — cargalos primero.");

    const nutrientTargets: Record<string, { minimum: number; maximum: number }> = {};
    for (const row of targets) {
      nutrientTargets[row.nutrient_key] = { minimum: row.minimum, maximum: row.maximum };
    }

    try {
      const response = await fetch(`${BACKEND_URL}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          num_days: numDays,
          nutrient_targets: nutrientTargets,
          weights: {
            cost: preferences.weight_cost / 100,
            variety: preferences.weight_variety / 100,
            prep_time: preferences.weight_prep_time / 100,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        return fail(body?.detail ?? `Error del backend (HTTP ${response.status})`);
      }

      setPlan(await response.json());
    } catch {
      return fail(`No se pudo conectar con el backend en ${BACKEND_URL}. ¿Está corriendo? (uvicorn food_opt.api:app --port 8000)`);
    } finally {
      setLoading(false);
    }
  }

  function fail(message: string) {
    setErrorMessage(message);
    setLoading(false);
  }

  if (!authChecked) {
    return null;
  }

  if (!userId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
        <p>
          Iniciá sesión primero en{" "}
          <Link href="/preferences" className="underline">
            preferencias
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Plan de comidas</h1>
      <p className="text-sm text-gray-500">
        Usa tus preferencias y objetivos guardados para pedirle un plan al backend de optimización
        (local: {BACKEND_URL}).
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
          {loading ? "Generando..." : "Generar plan"}
        </button>
      </div>

      {errorMessage && <p className="text-red-600">{errorMessage}</p>}

      {plan && (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-gray-700">
            Costo total: <strong>${plan.total_cost.toFixed(2)}</strong> · Tiempo total de preparación:{" "}
            <strong>{plan.total_prep_time_minutes} min</strong> · Recetas distintas usadas:{" "}
            <strong>{plan.recipes_used.length}</strong>
          </div>
          {plan.days.map((day) => (
            <div key={day.day} className="rounded border p-3">
              <div className="font-medium">Día {day.day + 1}</div>
              <ul className="mt-1 list-inside list-disc text-sm">
                {Object.entries(day.servings).map(([recipe, servings]) => (
                  <li key={recipe}>
                    {recipe} × {servings}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 text-sm">
        <Link href="/preferences" className="underline">
          ← Preferencias
        </Link>
        <Link href="/targets" className="underline">
          ← Objetivos
        </Link>
      </div>
    </main>
  );
}
