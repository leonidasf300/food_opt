import { describe, expect, it } from "vitest";
import { convertFromCop, formatMoney } from "./money";

// Intl may use a non-breaking space between the code and the number.
const normalize = (s: string) => s.replace(/\s/g, " ");

describe("convertFromCop", () => {
  it("leaves pesos untouched", () => {
    expect(convertFromCop(26400, "COP", 4000)).toBe(26400);
  });

  it("divides by the rate for dollars", () => {
    expect(convertFromCop(26400, "USD", 4000)).toBeCloseTo(6.6);
  });
});

describe("formatMoney", () => {
  it("shows COP as whole pesos with Colombian grouping", () => {
    expect(normalize(formatMoney(47642.86, "COP", "es-CO", 4000))).toBe("COP 47.643");
  });

  it("shows USD with two decimals", () => {
    expect(normalize(formatMoney(47642.86, "USD", "en-US", 4000))).toBe("USD 11.91");
  });

  it("formats the same amount with the number style of the chosen language", () => {
    expect(normalize(formatMoney(26400, "COP", "en-US", 4000))).toBe("COP 26,400");
  });
});
