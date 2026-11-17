"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { fetchActivePlan, type MealPlan } from "@/lib/mealPlan";
import { buildTimeline, canUndo, currentStepIndex, type TimelineStep } from "@/lib/timeline";
import { useSettings } from "@/lib/i18n/SettingsContext";
import { useCatalogNames } from "@/lib/i18n/useCatalogNames";
import { useDashboardUser } from "../UserContext";
import { ShoppingListTable, shoppingTotal } from "../_views/ShoppingListTable";

type RecipeDetail = {
  name: string;
  prep_time_minutes: number;
  created_by: string | null;
  recipe_ingredients: { quantity: number; ingredients: { name: string } | null }[];
};

export default function TodayPage() {
  const { id: userId } = useDashboardUser();
  const { t, formatMoney, formatDate } = useSettings();
  const td = t.today;
  const names = useCatalogNames();
  const longDate = (iso: string) => formatDate(iso, { weekday: "long", day: "numeric", month: "long" });
  const stepLabel = (step: TimelineStep) => (step.kind === "shopping" ? td.shopping : td.day(step.dayNumber));
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<Record<string, RecipeDetail>>({});
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showPlan = useCallback((active: MealPlan | null) => {
    setPlan(active);
    if (active) setSelected(currentStepIndex(buildTimeline(active)));
  }, []);

  useEffect(() => {
    fetchActivePlan(userId)
      .then(async (active) => {
        showPlan(active);
        if (!active) return;
        const names = [...new Set(active.meal_plan_days.flatMap((day) => Object.keys(day.servings)))];
        const { data, error } = await supabase
          .from("recipes")
          .select("name, prep_time_minutes, created_by, recipe_ingredients (quantity, ingredients (name))")
          .in("name", names);
        if (error) throw new Error(error.message);
        // The plan stores recipe names; if a user recipe shares a name with a sample
        // one, prefer the user's own.
        const byName: Record<string, RecipeDetail> = {};
        for (const recipe of (data ?? []) as unknown as RecipeDetail[]) {
          if (!byName[recipe.name] || recipe.created_by === userId) byName[recipe.name] = recipe;
        }
        setRecipes(byName);
      })
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setLoaded(true));
  }, [showPlan, userId]);

  async function setStepDone(step: TimelineStep, done: boolean) {
    if (!plan) return;
    setSaving(true);
    setErrorMessage(null);
    const completedAt = done ? new Date().toISOString() : null;
    const { error } =
      step.kind === "shopping"
        ? await supabase.from("meal_plans").update({ shopping_done_at: completedAt }).eq("id", plan.id)
        : await supabase.from("meal_plan_days").update({ completed_at: completedAt }).eq("id", step.dayId);
    if (error) {
      setErrorMessage(error.message);
    } else {
      await fetchActivePlan(userId)
        .then(showPlan)
        .catch((loadError: Error) => setErrorMessage(loadError.message));
      // Undoing keeps the undone step on screen instead of jumping away from it.
      if (!done) setSelected(step.index);
    }
    setSaving(false);
  }

  if (!loaded) return null;

  if (!plan) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <h1 className="text-xl font-semibold">{td.title}</h1>
        <p>
          {td.noPlanBefore}{" "}
          <Link href="/dashboard/plan" className="underline">
            {td.generateOne}
          </Link>{" "}
          {td.noPlanAfter}
        </p>
      </div>
    );
  }

  const steps = buildTimeline(plan);
  const step = steps[selected] ?? steps[0];
  const allDone = steps.every((s) => s.status === "done");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{td.title}</h1>
        <p className="text-sm text-gray-500">
          {allDone ? td.allDone : td.progress(currentStepIndex(steps), steps.length - 1)}
        </p>
      </div>

      {allDone && (
        <div className="rounded border border-green-600 p-4 text-sm">
          {td.completedBefore}{" "}
          <Link href="/dashboard/plan" className="underline">
            {td.generateNext}
          </Link>
          .
        </div>
      )}

      {/* Timeline: every step as a compact chip, so long plans don't crowd the screen. */}
      <ol className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((s) => (
          <li key={s.index}>
            <button
              type="button"
              onClick={() => setSelected(s.index)}
              aria-current={s.status === "current" ? "step" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
                s.index === step.index ? "border-black dark:border-white" : "border-gray-300 dark:border-zinc-700"
              } ${s.status === "pending" ? "text-gray-500" : ""}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  s.status === "done" ? "bg-green-600" : s.status === "current" ? "bg-black dark:bg-white" : "border border-gray-400"
                }`}
              />
              {stepLabel(s)}
            </button>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-4 rounded border p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-gray-500">
              {td.step(step.index)}
              {step.status === "current" && td.yourTurn}
              {step.status === "pending" && td.pending}
            </div>
            <h2 className="text-lg font-semibold">{stepLabel(step)}</h2>
            {step.completedAt && <div className="text-sm text-green-600">{td.doneOn(longDate(step.completedAt))}</div>}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setSelected(step.index - 1)}
              disabled={step.index === 0}
              aria-label={td.prevStep}
              className="rounded border px-3 py-1 disabled:opacity-30"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setSelected(step.index + 1)}
              disabled={step.index === steps.length - 1}
              aria-label={td.nextStep}
              className="rounded border px-3 py-1 disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>

        {step.kind === "shopping" ? (
          <>
            <p className="text-sm text-gray-500">
              {td.shoppingIntro(plan.num_days, formatMoney(shoppingTotal(plan.shopping_list)))}
            </p>
            <ShoppingListTable items={plan.shopping_list} />
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(step.servings).map(([name, servings]) => {
              const recipe = recipes[name];
              return (
                <div key={name} className="rounded border p-3">
                  <div className="font-medium">
                    {names.recipe(name)} × {servings} {td.servings(servings)}
                  </div>
                  {recipe && (
                    <>
                      <div className="text-sm text-gray-500">{td.prepPerServing(recipe.prep_time_minutes)}</div>
                      <ul className="mt-1 list-inside list-disc text-sm text-gray-700 dark:text-gray-300">
                        {recipe.recipe_ingredients.map((ri, i) => (
                          <li key={i}>
                            {ri.ingredients ? names.ingredient(ri.ingredients.name) : "?"} — {Math.round(ri.quantity * servings)} g
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step.status === "current" && (
          <button
            type="button"
            onClick={() => setStepDone(step, true)}
            disabled={saving}
            className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {saving ? t.common.saving : step.kind === "shopping" ? td.doneShopping : td.doneCooking}
          </button>
        )}
        {step.status === "pending" && <p className="text-sm text-gray-500">{td.completeFirst(currentStepIndex(steps))}</p>}
        {canUndo(steps, step.index) && (
          <button
            type="button"
            onClick={() => setStepDone(step, false)}
            disabled={saving}
            className="self-start text-sm underline disabled:opacity-50"
          >
            {td.undo}
          </button>
        )}
      </section>

      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
    </div>
  );
}
