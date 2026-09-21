import { describe, expect, it } from "vitest";
import { redistributeWeights, type Weights } from "./preferences";

const BASE: Weights = { cost: 34, variety: 33, prepTime: 33 };

describe("redistributeWeights", () => {
  it("always sums to exactly 100", () => {
    const next = redistributeWeights(BASE, "cost", 70);
    expect(next.cost + next.variety + next.prepTime).toBe(100);
  });

  it("clamps the moved slider to [0, 100]", () => {
    expect(redistributeWeights(BASE, "cost", 150).cost).toBe(100);
    expect(redistributeWeights(BASE, "cost", -20).cost).toBe(0);
  });

  it("splits the remainder evenly when the other two are both zero", () => {
    const next = redistributeWeights({ cost: 100, variety: 0, prepTime: 0 }, "cost", 40);
    expect(next).toEqual({ cost: 40, variety: 30, prepTime: 30 });
  });

  it("keeps the sum at 100 across a sequence of moves (rounding drift doesn't accumulate)", () => {
    let weights = BASE;
    for (const value of [10, 77, 3, 91, 0, 50]) {
      weights = redistributeWeights(weights, "variety", value);
      expect(weights.cost + weights.variety + weights.prepTime).toBe(100);
    }
  });
});
