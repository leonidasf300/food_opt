// Relative imports: vitest has no "@/" alias configured.
import { supabase } from "./supabase/client";
import { suggestNutrientTargets, type BodyProfile } from "./nutritionGoals";

// Nutrient targets have two modes (especificaciones/01-specify.md, module 4):
// - automatic (is_custom = false): computed from the latest body measurement. Saving a
//   new measurement asks whether to recompute; "yes" recomputes and stays automatic.
// - manual (is_custom = true): typed by the user; new measurements never touch them.

export type TargetsMode = "none" | "auto" | "manual";

export const NUTRIENT_KEYS = ["calories", "protein_g", "fat_g", "carbs_g"] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

/** Mode implied by the saved rows. Any custom row means manual -- never overwrite a hand edit. */
export function targetsMode(rows: { is_custom: boolean }[] | null | undefined): TargetsMode {
  if (!rows || rows.length === 0) return "none";
  return rows.some((row) => row.is_custom) ? "manual" : "auto";
}

/** Rows to upsert for automatic mode, computed from a body profile. */
export function automaticTargetRows(userId: string, profile: BodyProfile) {
  const suggested = suggestNutrientTargets(profile);
  return NUTRIENT_KEYS.map((key) => ({ user_id: userId, nutrient_key: key, ...suggested[key], is_custom: false }));
}

/** Recomputes the targets from `profile` and saves them in automatic mode. */
export async function saveAutomaticTargets(userId: string, profile: BodyProfile): Promise<void> {
  const { error } = await supabase
    .from("user_nutrient_targets")
    .upsert(automaticTargetRows(userId, profile), { onConflict: "user_id,nutrient_key" });
  if (error) throw new Error(error.message);
}

type BodyProfileRow = {
  sex: BodyProfile["sex"];
  age: number;
  height_cm: number;
  weight_kg: number;
  neck_cm: number;
  waist_cm: number;
  hip_cm: number | null;
  goal: BodyProfile["goal"];
};

export function bodyProfileFromRow(row: BodyProfileRow): BodyProfile {
  return {
    sex: row.sex,
    age: row.age,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    neckCm: row.neck_cm,
    waistCm: row.waist_cm,
    hipCm: row.hip_cm,
    goal: row.goal,
  };
}
