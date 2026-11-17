import type { Locale } from "./i18n/messages";

// Display names for catalog data that comes from the DB. Canonical names stay the keys
// everywhere (plans store recipe names, shopping lists store ingredient names), and only
// the rendered text is translated. See migration 20261110230000_add_name_translations.sql:
// ingredients are canonically English (USDA) with a Spanish `name_es`; recipes are
// canonically Spanish with an English `name_en`. Missing translation -> canonical name.

export type CatalogTranslations = {
  recipeNameEn: Record<string, string | null>;
  ingredientNameEs: Record<string, string | null>;
  purchaseLabelEn: Record<string, string | null>;
};

export const EMPTY_TRANSLATIONS: CatalogTranslations = { recipeNameEn: {}, ingredientNameEs: {}, purchaseLabelEn: {} };

export function recipeName(tr: CatalogTranslations, locale: Locale, name: string): string {
  return locale === "en" ? (tr.recipeNameEn[name] ?? name) : name;
}

export function ingredientName(tr: CatalogTranslations, locale: Locale, name: string): string {
  return locale === "es" ? (tr.ingredientNameEs[name] ?? name) : name;
}

/** `label` is the Spanish label as stored (e.g. in a plan's shopping-list snapshot). */
export function purchaseLabel(tr: CatalogTranslations, locale: Locale, ingredient: string, label: string): string {
  return locale === "en" ? (tr.purchaseLabelEn[ingredient] ?? label) : label;
}
