import { describe, expect, it } from "vitest";
import { backendErrorText, isValidNumDays } from "./planRequest";

describe("isValidNumDays", () => {
  it("accepts whole numbers from 1 to 14", () => {
    expect(isValidNumDays(1)).toBe(true);
    expect(isValidNumDays(14)).toBe(true);
  });

  it("rejects what an empty or out-of-range input produces", () => {
    expect(isValidNumDays(0)).toBe(false); // Number("") -- the field was cleared
    expect(isValidNumDays(15)).toBe(false);
    expect(isValidNumDays(-1)).toBe(false);
    expect(isValidNumDays(2.5)).toBe(false);
    expect(isValidNumDays(NaN)).toBe(false);
  });
});

describe("backendErrorText", () => {
  it("passes a string detail through", () => {
    expect(backendErrorText("No plan meets these nutrient targets")).toBe("No plan meets these nutrient targets");
  });

  it("flattens FastAPI's validation-error array into text", () => {
    const detail = [
      { type: "greater_than", loc: ["body", "num_days"], msg: "Input should be greater than 0", input: 0 },
      { type: "value_error", loc: ["body", "nutrient_targets", "calories"], msg: "Value error, minimum > maximum" },
    ];
    expect(backendErrorText(detail)).toBe(
      "num_days: Input should be greater than 0; nutrient_targets.calories: Value error, minimum > maximum"
    );
  });

  it("always returns a string or null, never an object", () => {
    expect(backendErrorText(undefined)).toBeNull();
    expect(backendErrorText(null)).toBeNull();
    expect(backendErrorText({ msg: "not the documented shape" })).toBeNull();
    expect(backendErrorText([])).toBeNull();
    expect(backendErrorText([{ unexpected: true }, 42])).toBeNull();
    expect(backendErrorText("   ")).toBeNull();
  });
});
