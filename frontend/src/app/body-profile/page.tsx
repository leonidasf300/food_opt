"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { calculateBmi, calculateBodyFatPercent, suggestNutrientTargets, type BodyProfile, type Goal, type Sex } from "@/lib/nutritionGoals";
import { LineChart } from "@/components/LineChart";

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

const GOALS: { value: Goal; label: string }[] = [
  { value: "maintain", label: "Mantener mi peso" },
  { value: "lose_fat", label: "Bajar grasa" },
  { value: "lose_weight", label: "Bajar peso" },
  { value: "gain_muscle", label: "Aumentar masa muscular" },
];

const GOAL_LABEL: Record<Goal, string> = Object.fromEntries(GOALS.map(({ value, label }) => [value, label])) as Record<
  Goal,
  string
>;

export default function BodyProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

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
    if (!userId) return;
    loadHistory(userId);
  }, [userId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!userId) return;
    setErrorMessage(null);

    const age = Number(form.age);
    const heightCm = Number(form.heightCm);
    const weightKg = Number(form.weightKg);
    const neckCm = Number(form.neckCm);
    const waistCm = Number(form.waistCm);
    const hipCm = form.sex === "female" ? Number(form.hipCm) : null;

    if (!age || !heightCm || !weightKg || !neckCm || !waistCm || (form.sex === "female" && !hipCm)) {
      setErrorMessage("Completá todos los campos (cadera es obligatoria para mujeres).");
      return;
    }

    setSaving(true);
    setSaved(false);
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

    // Saving a body profile with nothing waiting on a separate visit to Objetivos
    // nutricionales -- without this, plan generation fails with "no hay objetivos
    // guardados" until the user happens to open /targets and click Guardar there.
    // Only auto-fills when targets haven't been manually customized (is_custom),
    // same rule /targets itself uses, so an explicit "Personalizar" choice is never
    // silently overwritten.
    const { data: existingTargets, error: targetsReadError } = await supabase
      .from("user_nutrient_targets")
      .select("is_custom")
      .eq("user_id", userId);
    if (!targetsReadError) {
      const hasCustomTargets = existingTargets?.some((row) => row.is_custom);
      if (!hasCustomTargets) {
        const profile: BodyProfile = {
          sex: form.sex,
          age,
          heightCm,
          weightKg,
          neckCm,
          waistCm,
          hipCm,
          goal: form.goal,
        };
        const suggested = suggestNutrientTargets(profile);
        await supabase.from("user_nutrient_targets").upsert(
          [
            { user_id: userId, nutrient_key: "calories", ...suggested.calories, is_custom: false },
            { user_id: userId, nutrient_key: "protein_g", ...suggested.protein_g, is_custom: false },
            { user_id: userId, nutrient_key: "fat_g", ...suggested.fat_g, is_custom: false },
            { user_id: userId, nutrient_key: "carbs_g", ...suggested.carbs_g, is_custom: false },
          ],
          { onConflict: "user_id,nutrient_key" }
        );
      }
    }

    setSaving(false);
    setSaved(true);
    loadHistory(userId);
  }

  if (!authChecked) return null;

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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Perfil corporal</h1>
      <p className="text-sm text-gray-500">
        Estos datos se usan para precalcular tus objetivos nutricionales — después los vas a poder personalizar a
        mano si querés. Cada vez que guardás queda una medición nueva en el historial de abajo.
      </p>

      <form onSubmit={handleSave} className="flex max-w-md flex-col gap-4">
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Sexo
            <select
              value={form.sex}
              onChange={(event) => update("sex", event.target.value as Sex)}
              className="rounded border px-3 py-2"
            >
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Edad
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
            Estatura (cm)
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
            Peso (kg)
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

        <p className="text-sm font-medium">Medidas (método Navy, para % de grasa corporal)</p>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Cuello (cm)
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
            Cintura (cm)
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
              Cadera (cm)
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
            {bmi !== null && <div>IMC: {bmi.toFixed(1)}</div>}
            {bodyFat !== null && <div>Grasa corporal estimada: {bodyFat.toFixed(1)}%</div>}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Objetivo
          <select
            value={form.goal}
            onChange={(event) => update("goal", event.target.value as Goal)}
            className="rounded border px-3 py-2"
          >
            {GOALS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-gray-500">
          Asumimos que un objetivo de subir masa o bajar grasa viene acompañado de entrenamiento aparte — esta app
          no lo provee.
        </p>

        <button type="submit" disabled={saving} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar nueva medición"}
        </button>
      </form>

      {saved && <p className="text-green-600">Guardado.</p>}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}

      {history.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Historial ({history.length} medición{history.length === 1 ? "" : "es"})</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <LineChart title="Peso" unit="kg" color="#2a78d6" points={weightPoints} />
            <LineChart title="Grasa corporal" unit="%" color="#eb6834" points={bodyFatPoints} />
          </div>

          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Peso (kg)</th>
                  <th className="px-3 py-2 font-medium">IMC</th>
                  <th className="px-3 py-2 font-medium">% Grasa</th>
                  <th className="px-3 py-2 font-medium">Cuello</th>
                  <th className="px-3 py-2 font-medium">Cintura</th>
                  <th className="px-3 py-2 font-medium">Cadera</th>
                  <th className="px-3 py-2 font-medium">Objetivo</th>
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
                      <td className="px-3 py-2 text-gray-500">{new Date(row.measured_at).toLocaleDateString("es-CO")}</td>
                      <td className="px-3 py-2">{row.weight_kg}</td>
                      <td className="px-3 py-2">{rowBmi.toFixed(1)}</td>
                      <td className="px-3 py-2">{rowBodyFat !== null ? `${rowBodyFat.toFixed(1)}%` : "—"}</td>
                      <td className="px-3 py-2">{row.neck_cm}</td>
                      <td className="px-3 py-2">{row.waist_cm}</td>
                      <td className="px-3 py-2">{row.hip_cm ?? "—"}</td>
                      <td className="px-3 py-2">{GOAL_LABEL[row.goal]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-4 text-sm">
        <Link href="/preferences" className="underline">
          ← Preferencias
        </Link>
        <Link href="/targets" className="underline">
          Objetivos nutricionales →
        </Link>
      </div>
    </main>
  );
}
