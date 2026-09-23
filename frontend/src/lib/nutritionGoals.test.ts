import { describe, expect, it } from "vitest";
import {
  calculateBmi,
  calculateBmr,
  calculateBodyFatPercent,
  suggestNutrientTargets,
  type BodyProfile,
} from "./nutritionGoals";

const MALE: BodyProfile = {
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  neckCm: 38,
  waistCm: 85,
  hipCm: null,
  goal: "maintain",
};

const FEMALE: BodyProfile = {
  sex: "female",
  age: 28,
  heightCm: 165,
  weightKg: 60,
  neckCm: 32,
  waistCm: 70,
  hipCm: 95,
  goal: "lose_fat",
};

describe("calculateBmr", () => {
  it("matches the Mifflin-St Jeor formula for men (+5)", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calculateBmr(MALE)).toBeCloseTo(1780, 5);
  });

  it("matches the Mifflin-St Jeor formula for women (-161)", () => {
    // 10*60 + 6.25*165 - 5*28 - 161 = 600 + 1031.25 - 140 - 161 = 1330.25
    expect(calculateBmr(FEMALE)).toBeCloseTo(1330.25, 5);
  });
});

describe("calculateBmi", () => {
  it("computes weight_kg / height_m^2", () => {
    expect(calculateBmi({ heightCm: 180, weightKg: 80 })).toBeCloseTo(80 / 1.8 ** 2, 5);
  });
});

describe("calculateBodyFatPercent", () => {
  it("returns a plausible percentage for a male profile within measurements", () => {
    const bf = calculateBodyFatPercent(MALE);
    expect(bf).not.toBeNull();
    expect(bf as number).toBeGreaterThan(0);
    expect(bf as number).toBeLessThan(50);
  });

  it("returns a plausible percentage for a female profile with hip measurement", () => {
    const bf = calculateBodyFatPercent(FEMALE);
    expect(bf).not.toBeNull();
    expect(bf as number).toBeGreaterThan(0);
    expect(bf as number).toBeLessThan(50);
  });

  it("returns null for a female profile missing the hip measurement", () => {
    expect(calculateBodyFatPercent({ ...FEMALE, hipCm: null })).toBeNull();
  });

  it("returns null when waist is not greater than neck (invalid log10 input)", () => {
    expect(calculateBodyFatPercent({ ...MALE, waistCm: 38, neckCm: 38 })).toBeNull();
  });
});

describe("suggestNutrientTargets", () => {
  it("produces ranges where minimum < target < maximum for every nutrient", () => {
    const targets = suggestNutrientTargets(MALE);
    for (const key of ["calories", "protein_g", "fat_g", "carbs_g"] as const) {
      expect(targets[key].minimum).toBeLessThan(targets[key].maximum);
      expect(targets[key].minimum).toBeGreaterThan(0);
    }
  });

  it("gives lose_fat a lower calorie range than maintain, for the same body", () => {
    const maintain = suggestNutrientTargets({ ...FEMALE, goal: "maintain" });
    const loseFat = suggestNutrientTargets({ ...FEMALE, goal: "lose_fat" });
    expect(loseFat.calories.maximum).toBeLessThan(maintain.calories.maximum);
  });

  it("gives gain_muscle a higher calorie range than maintain, for the same body", () => {
    const maintain = suggestNutrientTargets({ ...MALE, goal: "maintain" });
    const gain = suggestNutrientTargets({ ...MALE, goal: "gain_muscle" });
    expect(gain.calories.minimum).toBeGreaterThan(maintain.calories.minimum);
  });

  it("gives lose_fat more protein per kg than lose_weight, for the same body", () => {
    const loseFat = suggestNutrientTargets({ ...MALE, goal: "lose_fat" });
    const loseWeight = suggestNutrientTargets({ ...MALE, goal: "lose_weight" });
    expect(loseFat.protein_g.minimum).toBeGreaterThan(loseWeight.protein_g.minimum);
  });

  it("never drops the calorie target below the 1200 kcal floor", () => {
    const tinyDeficit = suggestNutrientTargets({
      sex: "female",
      age: 40,
      heightCm: 150,
      weightKg: 45,
      neckCm: 30,
      waistCm: 60,
      hipCm: 85,
      goal: "lose_fat",
    });
    expect(tinyDeficit.calories.minimum).toBeGreaterThanOrEqual(Math.round(1200 * 0.9));
  });
});
