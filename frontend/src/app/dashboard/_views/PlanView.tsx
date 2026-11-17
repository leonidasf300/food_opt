"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { DEFAULT_WEIGHTS } from "@/lib/preferences";
import { fetchActivePlan, saveActivePlan, type MealPlan, type PlanResponse } from "@/lib/mealPlan";import { useSettings } from "@/lib/i18n/SettingsContext";
import { useCatalogNames } from "@/lib/i18n/useCatalogNames";
import { useDashboardUser } from "../UserContext";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:8000";

export function PlanView({ onSaved }: { onSaved?: () => void }) {
  const { id: userId } = useDashboardUser();
  const { t, formatMoney, formatDate } = useSettings();
  const p = t.plan;
  const names = useCatalogNames();
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
    if (inProgress && !window.confirm(p.confirmReplace)) return;

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
    if (!targets || targets.length === 0) return fail(p.noTargets);

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
          num_days: numDays,          nutrient_targets: nutrientTargets,
          weights: { cost: weights.cost / 100, variety: weights.variety / 100, prep_time: weights.prepTime / 100 },
        }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        return fail(errorBody?.detail ?? p.backendError(response.status));
      }
      body = await response.json();
    } catch {
      return fail(p.backendUnreachable(BACKEND_URL));
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
      <h1 className="text-xl font-semibold">{p.title}</h1>
      <p className="text-sm text-gray-500">{p.intro}</p>

      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          {p.days}
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
          {loading ? p.generating : plan ? p.generateNew : p.generate}
        </button>
      </div>

      {errorMessage && <p className="text-red-600">{errorMessage}</p>}

      {plan && (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-gray-700">
            {p.activeSince(formatDate(plan.created_at))} · {p.totalCost}:{" "}
            <strong>{formatMoney(Number(plan.total_cost))}</strong> · {p.totalPrep}:{" "}
            <strong>{Number(plan.total_prep_time_minutes)} min</strong> · {p.distinctRecipes}: <strong>{distinctRecipes}</strong>
          </div>
          {plan.meal_plan_days.map((day) => (
            <div key={day.id} className="rounded border p-3">
              <div className="flex justify-between font-medium">
                <span>{p.day(day.day_index + 1)}</span>
                {day.completed_at && <span className="text-sm font-normal text-green-600">{t.common.done}</span>}
              </div>
              <ul className="mt-1 list-inside list-disc text-sm">
                {Object.entries(day.servings).map(([recipe, servings]) => (
                  <li key={recipe}>
                    {names.recipe(recipe)} × {servings}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {!onSaved && (
            <Link href="/dashboard/today" className="underline">
              {p.goToToday}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
