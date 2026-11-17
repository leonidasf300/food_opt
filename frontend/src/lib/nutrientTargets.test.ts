import { describe, expect, it, vi } from "vitest";

// The module imports the Supabase client; the pure helpers tested here don't use it.
vi.mock("./supabase/client", () => ({ supabase: {} }));

import { automaticTargetRows, targetsMode } from "./nutrientTargets";

describe("targetsMode", () => {
  it("is none without saved targets", () => {
    expect(targetsMode([])).toBe("none");
    expect(targetsMode(null)).toBe("none");
  });

  it("is auto when every row is computed", () => {
    expect(targetsMode([{ is_custom: false }, { is_custom: false }])).toBe("auto");
  });

  it("is manual as soon as any row was edited by hand", () => {
    expect(targetsMode([{ is_custom: false }, { is_custom: true }])).toBe("manual");
  });
});

describe("automaticTargetRows", () => {
  it("produces the four nutrients, all marked automatic", () => {
    const rows = automaticTargetRows("user-1", {
      sex: "male",
      age: 30,
      heightCm: 180,
      weightKg: 80,
      neckCm: 38,
      waistCm: 85,
      hipCm: null,
      goal: "maintain",
    });
    expect(rows.map((row) => row.nutrient_key)).toEqual(["calories", "protein_g", "fat_g", "carbs_g"]);
    for (const row of rows) {
      expect(row.is_custom).toBe(false);
      expect(row.user_id).toBe("user-1");
      expect(row.minimum).toBeLessThanOrEqual(row.maximum);
    }
  });
});
