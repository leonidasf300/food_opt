export type Sex = "male" | "female";
export type Goal = "maintain" | "lose_fat" | "lose_weight" | "gain_muscle";

export type BodyProfile = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  neckCm: number;
  waistCm: number;
  hipCm: number | null; // required for female, unused for male
  goal: Goal;
};

export type NutrientRange = { minimum: number; maximum: number };
export type SuggestedTargets = {
  calories: NutrientRange;
  protein_g: NutrientRange;
  fat_g: NutrientRange;
  carbs_g: NutrientRange;
};

// No activity-level input exists anywhere in the app yet, so this assumes a single
// "moderately active" multiplier (per especificaciones/01-specify.md module 4: the
// goal presumes an accompanying training program, not that this app tracks it).
const ACTIVITY_MULTIPLIER = 1.55;

// Common, moderate deficit/surplus in kcal/day -- not personalized to a target rate
// of change, just a reasonable default (~0.3-0.5 kg/week).
const GOAL_CALORIE_ADJUSTMENT: Record<Goal, number> = {
  maintain: 0,
  lose_fat: -500,
  lose_weight: -500,
  gain_muscle: 300,
};

// Protein target in g/kg bodyweight, higher for goals where preserving/building
// muscle matters most.
const GOAL_PROTEIN_G_PER_KG: Record<Goal, number> = {
  maintain: 1.8,
  lose_fat: 2.2,
  lose_weight: 1.6,
  gain_muscle: 2.0,
};

const FAT_CALORIE_SHARE = 0.25;
const RANGE_BAND = 0.1; // +/-10% around the computed target, to populate a min/max range

function toRange(target: number): NutrientRange {
  return {
    minimum: Math.round(target * (1 - RANGE_BAND)),
    maximum: Math.round(target * (1 + RANGE_BAND)),
  };
}

/** Mifflin-St Jeor basal metabolic rate (kcal/day). */
export function calculateBmr(profile: Pick<BodyProfile, "sex" | "age" | "heightCm" | "weightKg">): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === "male" ? base + 5 : base - 161;
}

export function calculateBmi(profile: Pick<BodyProfile, "heightCm" | "weightKg">): number {
  const heightM = profile.heightCm / 100;
  return profile.weightKg / (heightM * heightM);
}

/**
 * US Navy body-fat % method. Needs neck + waist (+ hip for women). All measurements
 * in cm. Returns null if a required measurement is missing.
 */
export function calculateBodyFatPercent(
  profile: Pick<BodyProfile, "sex" | "heightCm" | "neckCm" | "waistCm" | "hipCm">
): number | null {
  const { sex, heightCm, neckCm, waistCm, hipCm } = profile;
  if (!neckCm || !waistCm) return null;
  if (sex === "male") {
    if (waistCm <= neckCm) return null; // log10 of a non-positive number
    return 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
  }
  if (!hipCm) return null;
  const circumference = waistCm + hipCm - neckCm;
  if (circumference <= 0) return null;
  return 495 / (1.29579 - 0.35004 * Math.log10(circumference) + 0.221 * Math.log10(heightCm)) - 450;
}

/**
 * Suggested daily nutrient ranges (min/max, matching the existing Objetivos
 * nutricionales UI) from a body profile + generic goal. Not medical advice --
 * standard, generic formulas (Mifflin-St Jeor + fixed activity multiplier),
 * meant as a sensible pre-filled starting point the user can still edit by hand.
 */
export function suggestNutrientTargets(profile: BodyProfile): SuggestedTargets {
  const bmr = calculateBmr(profile);
  const tdee = bmr * ACTIVITY_MULTIPLIER;
  const calorieTarget = Math.max(1200, tdee + GOAL_CALORIE_ADJUSTMENT[profile.goal]);

  const proteinG = GOAL_PROTEIN_G_PER_KG[profile.goal] * profile.weightKg;
  const fatG = (calorieTarget * FAT_CALORIE_SHARE) / 9;
  const proteinAndFatCalories = proteinG * 4 + fatG * 9;
  const carbsG = Math.max(0, calorieTarget - proteinAndFatCalories) / 4;

  return {
    calories: toRange(calorieTarget),
    protein_g: toRange(proteinG),
    fat_g: toRange(fatG),
    carbs_g: toRange(carbsG),
  };
}
