import { describe, expect, it } from "vitest";
import { buildTimeline, canUndo, currentStepIndex } from "./timeline";

function plan(shoppingDone: boolean, daysDone: boolean[]) {
  return {
    shopping_done_at: shoppingDone ? "2026-09-25T10:00:00Z" : null,
    // Deliberately out of order: buildTimeline must sort by day_index.
    meal_plan_days: daysDone
      .map((done, i) => ({
        id: `day-${i}`,
        day_index: i,
        servings: { [`Receta ${i}`]: 1 },
        completed_at: done ? "2026-09-26T10:00:00Z" : null,
      }))
      .reverse(),
  };
}

describe("buildTimeline", () => {
  it("puts shopping first, then days in order", () => {
    const steps = buildTimeline(plan(false, [false, false]));
    expect(steps.map((s) => s.kind)).toEqual(["shopping", "day", "day"]);
    expect(steps.map((s) => (s.kind === "day" ? s.dayNumber : 0))).toEqual([0, 1, 2]);
  });

  it("makes shopping the current step on a fresh plan", () => {
    const steps = buildTimeline(plan(false, [false, false]));
    expect(steps.map((s) => s.status)).toEqual(["current", "pending", "pending"]);
    expect(currentStepIndex(steps)).toBe(0);
  });

  it("advances by sequence: current is the first step not done", () => {
    const steps = buildTimeline(plan(true, [true, false, false]));
    expect(steps.map((s) => s.status)).toEqual(["done", "done", "current", "pending"]);
    expect(currentStepIndex(steps)).toBe(2);
  });

  it("points at the last step when the whole plan is done", () => {
    const steps = buildTimeline(plan(true, [true, true]));
    expect(steps.every((s) => s.status === "done")).toBe(true);
    expect(currentStepIndex(steps)).toBe(2);
  });
});

describe("canUndo", () => {
  it("only allows undoing the most recently completed step", () => {
    const steps = buildTimeline(plan(true, [true, false]));
    expect(canUndo(steps, 1)).toBe(true);
    expect(canUndo(steps, 0)).toBe(false);
    expect(canUndo(steps, 2)).toBe(false);
  });

  it("allows nothing when no step is done", () => {
    const steps = buildTimeline(plan(false, [false]));
    expect(steps.some((_, i) => canUndo(steps, i))).toBe(false);
  });
});
