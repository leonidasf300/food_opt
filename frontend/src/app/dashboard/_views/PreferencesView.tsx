"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { DEFAULT_WEIGHTS, redistributeWeights, type Weights } from "@/lib/preferences";
import { useSettings } from "@/lib/i18n/SettingsContext";
import { useDashboardUser } from "../UserContext";

const SLIDERS: (keyof Weights)[] = ["cost", "variety", "prepTime"];

export function PreferencesView({ onSaved }: { onSaved?: () => void }) {
  const { id: userId } = useDashboardUser();
  const { t } = useSettings();
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("preferences")
      .select("weight_cost, weight_variety, weight_prep_time")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        if (data) {
          setWeights({ cost: data.weight_cost, variety: data.weight_variety, prepTime: data.weight_prep_time });
        }
      });
  }, [userId]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setErrorMessage(null);
    const { error } = await supabase.from("preferences").upsert({
      user_id: userId,
      weight_cost: weights.cost,
      weight_variety: weights.variety,
      weight_prep_time: weights.prepTime,
    });
    setSaving(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSaved(true);
    onSaved?.();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold">{t.preferences.title}</h1>
      <p className="text-sm text-gray-500">{t.preferences.intro}</p>

      {SLIDERS.map((key) => (
        <div key={key} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span>{t.preferences[key]}</span>
            <span>{weights[key]}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={weights[key]}
            onChange={(event) => setWeights((current) => redistributeWeights(current, key, Number(event.target.value)))}
            className="w-full"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {saving ? t.common.saving : t.common.save}
      </button>

      {saved && <p className="text-green-600">{t.common.saved}</p>}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
    </div>
  );
}
