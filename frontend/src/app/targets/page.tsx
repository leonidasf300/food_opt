"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type NutrientKey = "calories" | "protein_g" | "fat_g" | "carbs_g";

const NUTRIENTS: { key: NutrientKey; label: string; unit: string }[] = [
  { key: "calories", label: "Calorías", unit: "kcal" },
  { key: "protein_g", label: "Proteína", unit: "g" },
  { key: "fat_g", label: "Grasa", unit: "g" },
  { key: "carbs_g", label: "Carbohidratos", unit: "g" },
];

type Targets = Record<NutrientKey, { minimum: string; maximum: string }>;

const DEFAULT_TARGETS: Targets = {
  calories: { minimum: "1800", maximum: "2200" },
  protein_g: { minimum: "100", maximum: "200" },
  fat_g: { minimum: "40", maximum: "90" },
  carbs_g: { minimum: "150", maximum: "300" },
};

export default function TargetsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("user_nutrient_targets")
      .select("nutrient_key, minimum, maximum")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        if (data && data.length > 0) {
          setTargets((current) => {
            const next = { ...current };
            for (const row of data) {
              if (row.nutrient_key in next) {
                next[row.nutrient_key as NutrientKey] = {
                  minimum: String(row.minimum),
                  maximum: String(row.maximum),
                };
              }
            }
            return next;
          });
        }
      });
  }, [userId]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!userId) return;
    setErrorMessage(null);

    for (const { key, label } of NUTRIENTS) {
      const minimum = Number(targets[key].minimum);
      const maximum = Number(targets[key].maximum);
      if (Number.isNaN(minimum) || Number.isNaN(maximum) || minimum > maximum) {
        setErrorMessage(`${label}: el mínimo no puede ser mayor que el máximo.`);
        return;
      }
    }

    setSaving(true);
    setSaved(false);

    const rows = NUTRIENTS.map(({ key }) => ({
      user_id: userId,
      nutrient_key: key,
      minimum: Number(targets[key].minimum),
      maximum: Number(targets[key].maximum),
    }));

    const { error } = await supabase
      .from("user_nutrient_targets")
      .upsert(rows, { onConflict: "user_id,nutrient_key" });

    setSaving(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSaved(true);
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Objetivos nutricionales</h1>
      <p className="text-sm text-gray-500">Rango diario (mínimo / máximo) para cada nutriente.</p>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {NUTRIENTS.map(({ key, label, unit }) => (
          <div key={key} className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {label} ({unit})
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="any"
                value={targets[key].minimum}
                onChange={(event) =>
                  setTargets((current) => ({
                    ...current,
                    [key]: { ...current[key], minimum: event.target.value },
                  }))
                }
                placeholder="mínimo"
                className="w-full rounded border px-3 py-2"
              />
              <input
                type="number"
                min={0}
                step="any"
                value={targets[key].maximum}
                onChange={(event) =>
                  setTargets((current) => ({
                    ...current,
                    [key]: { ...current[key], maximum: event.target.value },
                  }))
                }
                placeholder="máximo"
                className="w-full rounded border px-3 py-2"
              />
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </form>

      {saved && <p className="text-green-600">Guardado.</p>}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}

      <div className="flex gap-4 text-sm">
        <Link href="/preferences" className="underline">
          ← Preferencias
        </Link>
        <Link href="/recipes" className="underline">
          Recetas →
        </Link>
        <Link href="/plan" className="underline">
          Generar plan →
        </Link>
      </div>
    </main>
  );
}
