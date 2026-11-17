"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { suggestNutrientTargets, type BodyProfile } from "@/lib/nutritionGoals";
import {
  bodyProfileFromRow,
  NUTRIENT_KEYS,
  saveAutomaticTargets,
  targetsMode,
  type NutrientKey,
} from "@/lib/nutrientTargets";
import { useSettings } from "@/lib/i18n/SettingsContext";
import { useDashboardUser } from "../UserContext";

const UNITS: Record<NutrientKey, string> = { calories: "kcal", protein_g: "g", fat_g: "g", carbs_g: "g" };

type Targets = Record<NutrientKey, { minimum: string; maximum: string }>;

const DEFAULT_TARGETS: Targets = {
  calories: { minimum: "1800", maximum: "2200" },
  protein_g: { minimum: "100", maximum: "200" },
  fat_g: { minimum: "40", maximum: "90" },
  carbs_g: { minimum: "150", maximum: "300" },
};

function targetsFromSuggestion(profile: BodyProfile): Targets {
  const suggested = suggestNutrientTargets(profile);
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [key, { minimum: String(suggested[key].minimum), maximum: String(suggested[key].maximum) }])
  ) as Targets;
}

/**
 * Automatic mode: fields locked, values come from the latest measurement (recomputed
 * when the user says "yes" after saving a measurement, or when switching to automatic).
 * Manual mode: fields editable, saved with is_custom = true so measurements never touch them.
 */
export function TargetsView({ onSaved }: { onSaved?: () => void }) {
  const { id: userId } = useDashboardUser();
  const { t } = useSettings();
  const tt = t.targets;
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);
  const [mode, setMode] = useState<"auto" | "manual">("manual");
  const [latestProfile, setLatestProfile] = useState<BodyProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase
        .from("body_profiles")
        .select("sex, age, height_cm, weight_kg, neck_cm, waist_cm, hip_cm, goal")
        .eq("user_id", userId)
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("user_nutrient_targets").select("nutrient_key, minimum, maximum, is_custom").eq("user_id", userId),
    ]).then(([bodyProfileRes, savedTargetsRes]) => {
      if (bodyProfileRes.error) return setErrorMessage(bodyProfileRes.error.message);
      if (savedTargetsRes.error) return setErrorMessage(savedTargetsRes.error.message);

      const savedTargets = savedTargetsRes.data ?? [];
      const profile = bodyProfileRes.data ? bodyProfileFromRow(bodyProfileRes.data) : null;
      setLatestProfile(profile);

      const savedMode = targetsMode(savedTargets);
      if (savedMode === "none") {
        // Nothing saved yet: offer the computed suggestion if there's a measurement.
        if (profile) {
          setTargets(targetsFromSuggestion(profile));
          setMode("auto");
        }
        return;
      }

      // Show what's saved, in either mode. Automatic targets are only recomputed on
      // an explicit "yes" -- recomputing on every visit would undo a "no".
      setTargets((current) => {
        const next = { ...current };
        for (const row of savedTargets) {
          if (row.nutrient_key in next) {
            next[row.nutrient_key as NutrientKey] = { minimum: String(row.minimum), maximum: String(row.maximum) };
          }
        }
        return next;
      });
      setMode(savedMode);
    });
  }, [userId]);

  async function switchToAuto() {
    if (!latestProfile) return;
    setErrorMessage(null);
    setSavedMessage(null);
    setSaving(true);
    try {
      await saveAutomaticTargets(userId, latestProfile);
    } catch (error) {
      setSaving(false);
      return setErrorMessage((error as Error).message);
    }
    setTargets(targetsFromSuggestion(latestProfile));
    setMode("auto");
    setSaving(false);
    setSavedMessage(tt.switchedToAuto);
  }

  function switchToManual() {
    // Only unlocks the fields; it becomes manual in the DB once the user saves.
    setSavedMessage(null);
    setMode("manual");
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    for (const key of NUTRIENT_KEYS) {
      const minimum = Number(targets[key].minimum);
      const maximum = Number(targets[key].maximum);
      if (Number.isNaN(minimum) || Number.isNaN(maximum) || minimum > maximum) {
        setErrorMessage(tt.minAboveMax(tt.nutrients[key]));
        return;
      }
    }

    setSaving(true);
    setSavedMessage(null);

    const rows = NUTRIENT_KEYS.map((key) => ({
      user_id: userId,
      nutrient_key: key,
      minimum: Number(targets[key].minimum),
      maximum: Number(targets[key].maximum),
      is_custom: mode === "manual",
    }));

    const { error } = await supabase.from("user_nutrient_targets").upsert(rows, { onConflict: "user_id,nutrient_key" });

    setSaving(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSavedMessage(t.common.saved);
    onSaved?.();
  }

  const locked = mode === "auto";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold">{tt.title}</h1>
      {locked ? (
        <p className="text-sm text-gray-500">
          {tt.lockedIntroBefore}{" "}
          <Link href="/dashboard/body-profile" className="underline">
            {tt.bodyProfileLink}
          </Link>
          {tt.lockedIntroAfter}
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          {tt.unlockedIntro}
          {!latestProfile && (
            <>
              {" "}
              {tt.completeProfileBefore}{" "}
              <Link href="/dashboard/body-profile" className="underline">
                {tt.bodyProfileLink}
              </Link>{" "}
              {tt.completeProfileAfter}
            </>
          )}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{tt.mode}</span>
        <div role="radiogroup" aria-label={tt.mode} className="flex self-start overflow-hidden rounded border text-sm">
          <button
            type="button"
            role="radio"
            aria-checked={mode === "auto"}
            onClick={switchToAuto}
            disabled={saving || !latestProfile || mode === "auto"}
            title={latestProfile ? undefined : tt.autoNeedsProfile}
            className={`px-4 py-2 ${
              mode === "auto" ? "bg-black text-white dark:bg-white dark:text-black" : "disabled:opacity-40"
            }`}
          >
            {tt.modeAuto}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "manual"}
            onClick={switchToManual}
            disabled={saving || mode === "manual"}
            className={`px-4 py-2 ${mode === "manual" ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}
          >
            {tt.modeManual}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {mode === "auto" ? tt.autoHint : latestProfile ? tt.manualHint : tt.autoNeedsProfile}
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {NUTRIENT_KEYS.map((key) => (
          <div key={key} className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {tt.nutrients[key]} ({UNITS[key]})
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="any"
                disabled={locked}
                value={targets[key].minimum}
                onChange={(event) =>
                  setTargets((current) => ({
                    ...current,
                    [key]: { ...current[key], minimum: event.target.value },
                  }))
                }
                placeholder={tt.min}
                className="w-full rounded border px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <input
                type="number"
                min={0}
                step="any"
                disabled={locked}
                value={targets[key].maximum}
                onChange={(event) =>
                  setTargets((current) => ({
                    ...current,
                    [key]: { ...current[key], maximum: event.target.value },
                  }))
                }
                placeholder={tt.max}
                className="w-full rounded border px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>
        ))}

        <button type="submit" disabled={saving} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
          {saving ? t.common.saving : t.common.save}
        </button>
      </form>

      {savedMessage && <p className="text-green-600">{savedMessage}</p>}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
    </div>
  );
}
