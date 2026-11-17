import { describe, expect, it } from "vitest";
import { ingredientName, purchaseLabel, recipeName, type CatalogTranslations } from "./catalogNames";

const tr: CatalogTranslations = {
  recipeNameEn: { "Pollo con arroz y brócoli": "Chicken with rice and broccoli", "Receta sin traducir": null },
  ingredientNameEs: { "Chicken breast, raw": "Pechuga de pollo, cruda" },
  purchaseLabelEn: { "Chicken breast, raw": "1000 g bag (skinless breast x2, FRIKO)" },
};

describe("recipeName", () => {
  it("keeps the canonical Spanish name in Spanish", () => {
    expect(recipeName(tr, "es", "Pollo con arroz y brócoli")).toBe("Pollo con arroz y brócoli");
  });

  it("uses the English translation in English", () => {
    expect(recipeName(tr, "en", "Pollo con arroz y brócoli")).toBe("Chicken with rice and broccoli");
  });

  it("falls back to the canonical name when there's no translation (e.g. a user recipe)", () => {
    expect(recipeName(tr, "en", "Receta sin traducir")).toBe("Receta sin traducir");
    expect(recipeName(tr, "en", "Mi receta")).toBe("Mi receta");
  });
});

describe("ingredientName", () => {
  it("uses the Spanish translation in Spanish and the canonical English name in English", () => {
    expect(ingredientName(tr, "es", "Chicken breast, raw")).toBe("Pechuga de pollo, cruda");
    expect(ingredientName(tr, "en", "Chicken breast, raw")).toBe("Chicken breast, raw");
  });

  it("falls back to the canonical name", () => {
    expect(ingredientName(tr, "es", "Quinoa")).toBe("Quinoa");
  });
});

describe("purchaseLabel", () => {
  const stored = "Bolsa 1000 g (pechuga sin piel x2, FRIKO)";

  it("keeps the stored Spanish label in Spanish", () => {
    expect(purchaseLabel(tr, "es", "Chicken breast, raw", stored)).toBe(stored);
  });

  it("swaps in the English label in English, falling back to the stored one", () => {
    expect(purchaseLabel(tr, "en", "Chicken breast, raw", stored)).toBe("1000 g bag (skinless breast x2, FRIKO)");
    expect(purchaseLabel(tr, "en", "Quinoa", "Bolsa 500 g")).toBe("Bolsa 500 g");
  });
});
