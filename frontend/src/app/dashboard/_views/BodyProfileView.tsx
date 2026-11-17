"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { calculateBmi, calculateBodyFatPercent, type BodyProfile, type Goal, type Sex } from "@/lib/nutritionGoals";
import { saveAutomaticTargets, targetsMode } from "@/lib/nutrientTargets";
import { LineChart } from "@/components/LineChart";
import { useSettings } from "@/lib/i18n/SettingsContext";
import { useDashboardUser } from "../UserContext";

type FormState = {
  sex: Sex;
  age: string;
  heightCm: string;
  weightKg: string;
  neckCm: string;
  waistCm: string;
  hipCm: string;
  goal: Goal;
};

type HistoryRow = {
  measured_at: string;
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  neck_cm: number;
  waist_cm: number;
  hip_cm: number | null;
  goal: Goal;
};

const DEFAULT_FORM: FormState = {
  sex: "male",
  age: "",
  heightCm: "",
  weightKg: "",
  neckCm: "",
  waistCm: "",
  hipCm: "",
  goal: "maintain",
};

const GOALS: Goal[] = ["maintain", "lose_fat", "lose_weight", "gain_muscle"];

export function BodyProfileView({ onSaved }: { onSaved?: () => void }) {
  const { id: userId } = useDashboardUser();
  const { t, formatDate } = useSettings();
  const b = t.bodyProfile;
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  // Measurement just saved, waiting for "update targets from it?" -- yes/no.
  const [pendingProfile, setPendingProfile] = useState<BodyProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function loadHistory(userId: string) {
    return supabase
      .from("body_profiles")
      .select("measured_at, sex, age, height_cm, weight_kg, neck_cm, waist_cm, hip_cm, goal")
      .eq("user_id", userId)
      .order("measured_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) return setErrorMessage(error.message);
        const rows = (data ?? []) as HistoryRow[];
        setHistory(rows);
        const latest = rows[rows.length - 1];
        if (latest) {
          setForm({
            sex: latest.sex,
            age: String(latest.age),
            heightCm: String(latest.height_cm),
            weightKg: String(latest.weight_kg),
            neckCm: latest.neck_cm != null ? String(latest.neck_cm) : "",
            waistCm: latest.waist_cm != null ? String(latest.waist_cm) : "",
            hipCm: latest.hip_cm != null ? String(latest.hip_cm) : "",
            goal: latest.goal,
          });
        }
      });
  }

  useEffect(() => {
    loadHistory(userId);
  }, [userId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    const age = Number(form.age);
    const heightCm = Number(form.heightCm);
    const weightKg = Number(form.weightKg);
    const neckCm = Number(form.neckCm);
    const waistCm = Number(form.waistCm);
    const hipCm = form.sex === "female" ? Number(form.hipCm) : null;

    if (!age || !heightCm || !weightKg || !neckCm || !waistCm || (form.sex === "female" && !hipCm)) {
      setErrorMessage(b.missingFields);
      return;
    }

    setSaving(true);
    setSavedMessage(null);
    // Each save is a new historical measurement, not an edit of the previous one --
    // that's what makes the chart/table below possible.
    const { error } = await supabase.from("body_profiles").insert({
      user_id: userId,
      sex: form.sex,
      age,
      height_cm: heightCm,
      weight_kg: weightKg,
      neck_cm: neckCm,
      waist_cm: waistCm,
      hip_cm: hipCm,
      goal: form.goal,
    });
    if (error) {
      setSaving(false);
      return setErrorMessage(error.message);
    }

    const profile: BodyProfile = { sex: form.sex, age, heightCm, weightKg, neckCm, waistCm, hipCm, goal: form.goal };
    const { data: existingTargets, error: targetsReadError } = await supabase
      .from("user_nutrient_targets")
      .select("is_custom")
      .eq("user_id", userId);
    if (targetsReadError) {
      setSaving(false);
      return setErrorMessage(targetsReadError.message);
    }

    if (targetsMode(existingTargets) === "none") {
      // First measurement: there's nothing to overwrite, and plan generation needs
      // targets -- create them in automatic mode without asking.
      try {
        await saveAutomaticTargets(userId, profile);
      } catch (error) {
        setSaving(false);
        return setErrorMessage((error as Error).message);
      }
      return finishSave(b.targetsUpdated);
    }

    // Targets already exist (automatic or manual): the user decides whether this
    // measurement should replace them. See answerUpdateTargets.
    setSaving(false);
    loadHistory(userId);
    setPendingProfile(profile);
  }

  /** Yes: recompute from the new measurement and switch to automatic. No: change nothing. */
  async function answerUpdateTargets(update: boolean) {
    if (update && pendingProfile) {
      setSaving(true);
      try {
        await saveAutomaticTargets(userId, pendingProfile);
      } catch (error) {
        setSaving(false);
        return setErrorMessage((error as Error).message);
      }
    }
    setPendingProfile(null);
    finishSave(update ? b.targetsUpdated : t.common.saved);
  }

  function finishSave(message: string) {
    setSaving(false);
    setSavedMessage(message);
    loadHistory(userId);
    onSaved?.();
  }

  const numericPreview = {
    heightCm: Number(form.heightCm),
    weightKg: Number(form.weightKg),
    neckCm: Number(form.neckCm),
    waistCm: Number(form.waistCm),
    hipCm: form.sex === "female" ? Number(form.hipCm) || null : null,
  };
  const canPreview = numericPreview.heightCm > 0 && numericPreview.weightKg > 0;
  const bmi = canPreview ? calculateBmi(numericPreview) : null;
  const bodyFat =
    canPreview && numericPreview.neckCm > 0 && numericPreview.waistCm > 0
      ? calculateBodyFatPercent({ sex: form.sex, ...numericPreview })
      : null;

  const weightPoints = history.map((row) => ({ date: row.measured_at, value: row.weight_kg }));
  const bodyFatPoints = history
    .map((row) => {
      const bf = calculateBodyFatPercent({
        sex: row.sex,
        heightCm: row.height_cm,
        neckCm: row.neck_cm,
        waistCm: row.waist_cm,
        hipCm: row.hip_cm,
      });
      return bf !== null ? { date: row.measured_at, value: Math.round(bf * 10) / 10 } : null;
    })
    .filter((p): p is { date: string; value: number } => p !== null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold">{b.title}</h1>
      <p className="text-sm text-gray-500">{b.intro}</p>

      <form onSubmit={handleSave} className="flex max-w-md flex-col gap-4">
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {b.sex}
            <select
              value={form.sex}
              onChange={(event) => update("sex", event.target.value as Sex)}
              className="rounded border px-3 py-2"
            >
              <option value="male">{b.male}</option>
              <option value="female">{b.female}</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {b.age}
            <input
              type="number"
              min={1}
              value={form.age}
              onChange={(event) => update("age", event.target.value)}
              className="rounded border px-3 py-2"
            />
          </label>
        </div>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {b.height}
            <input
              type="number"
              min={1}
              step="any"
              value={form.heightCm}
              onChange={(event) => update("heightCm", event.target.value)}
              className="rounded border px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {b.weight}
            <input
              type="number"
              min={1}
              step="any"
              value={form.weightKg}
              onChange={(event) => update("weightKg", event.target.value)}
              className="rounded border px-3 py-2"
            />
          </label>
        </div>

        <p className="text-sm font-medium">{b.measurements}</p>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {b.neck}
            <input
              type="number"
              min={1}
              step="any"
              value={form.neckCm}
              onChange={(event) => update("neckCm", event.target.value)}
              className="rounded border px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            {b.waist}
            <input
              type="number"
              min={1}
              step="any"
              value={form.waistCm}
              onChange={(event) => update("waistCm", event.target.value)}
              className="rounded border px-3 py-2"
            />
          </label>
          {form.sex === "female" && (
            <label className="flex flex-1 flex-col gap-1 text-sm">
              {b.hip}
              <input
                type="number"
                min={1}
                step="any"
                value={form.hipCm}
                onChange={(event) => update("hipCm", event.target.value)}
                className="rounded border px-3 py-2"
              />
            </label>
          )}
        </div>

        {(bmi !== null || bodyFat !== null) && (
          <div className="rounded border p-3 text-sm text-gray-700">
            {bmi !== null && (
              <div>
                {b.bmi}: {bmi.toFixed(1)}
              </div>
            )}
            {bodyFat !== null && (
              <div>
                {b.estimatedBodyFat}: {bodyFat.toFixed(1)}%
              </div>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          {b.goal}
          <select
            value={form.goal}
            onChange={(event) => update("goal", event.target.value as Goal)}
            className="rounded border px-3 py-2"
          >
            {GOALS.map((goal) => (
              <option key={goal} value={goal}>
                {b.goals[goal]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-gray-500">{b.trainingNote}</p>

        <button
          type="submit"
          disabled={saving || pendingProfile !== null}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {saving ? t.common.saving : b.saveMeasurement}
        </button>
      </form>

      {pendingProfile && (
        <div role="alertdialog" aria-labelledby="update-targets-question" className="flex max-w-md flex-col gap-3 rounded border border-black p-4 dark:border-white">
          <p id="update-targets-question" className="text-sm font-medium">
            {b.askUpdateTargets}
          </p>
          <p className="text-xs text-gray-500">{b.askUpdateDetail}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => answerUpdateTargets(true)}
              disabled={saving}
              className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {saving ? t.common.saving : b.updateYes}
            </button>
            <button
              type="button"
              onClick={() => answerUpdateTargets(false)}
              disabled={saving}
              className="rounded border px-3 py-2 text-sm disabled:opacity-50"
            >
              {b.updateNo}
            </button>
          </div>
        </div>
      )}

      {savedMessage && <p className="text-green-600">{savedMessage}</p>}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}

      {history.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{b.history(history.length)}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <LineChart title={b.chartWeight} unit="kg" color="#2a78d6" points={weightPoints} />
            <LineChart title={b.chartBodyFat} unit="%" color="#eb6834" points={bodyFatPoints} />
          </div>

          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium">{b.colDate}</th>
                  <th className="px-3 py-2 font-medium">{b.colWeight}</th>
                  <th className="px-3 py-2 font-medium">{b.colBmi}</th>
                  <th className="px-3 py-2 font-medium">{b.colBodyFat}</th>
                  <th className="px-3 py-2 font-medium">{b.colNeck}</th>
                  <th className="px-3 py-2 font-medium">{b.colWaist}</th>
                  <th className="px-3 py-2 font-medium">{b.colHip}</th>
                  <th className="px-3 py-2 font-medium">{b.colGoal}</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((row) => {
                  const rowBmi = calculateBmi({ heightCm: row.height_cm, weightKg: row.weight_kg });
                  const rowBodyFat = calculateBodyFatPercent({
                    sex: row.sex,
                    heightCm: row.height_cm,
                    neckCm: row.neck_cm,
                    waistCm: row.waist_cm,
                    hipCm: row.hip_cm,
                  });
                  return (
                    <tr key={row.measured_at} className="border-b last:border-0">
                      <td className="px-3 py-2 text-gray-500">{formatDate(row.measured_at)}</td>
                      <td className="px-3 py-2">{row.weight_kg}</td>
                      <td className="px-3 py-2">{rowBmi.toFixed(1)}</td>
                      <td className="px-3 py-2">{rowBodyFat !== null ? `${rowBodyFat.toFixed(1)}%` : "—"}</td>
                      <td className="px-3 py-2">{row.neck_cm}</td>
                      <td className="px-3 py-2">{row.waist_cm}</td>
                      <td className="px-3 py-2">{row.hip_cm ?? "—"}</td>
                      <td className="px-3 py-2">{b.goals[row.goal]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
