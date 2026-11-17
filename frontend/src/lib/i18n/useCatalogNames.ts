"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  EMPTY_TRANSLATIONS,
  ingredientName,
  purchaseLabel,
  recipeName,
  type CatalogTranslations,
} from "@/lib/catalogNames";
import { useSettings } from "./SettingsContext";

// Both catalog tables are tiny (tens of rows), so load every translation once per page
// load and share it across components.
let cached: Promise<CatalogTranslations> | null = null;

async function loadTranslations(): Promise<CatalogTranslations> {
  const [recipes, ingredients] = await Promise.all([
    // Only seed recipes carry translations; user recipes show whatever name they typed.
    supabase.from("recipes").select("name, name_en").is("created_by", null),
    supabase.from("ingredients").select("name, name_es, purchase_unit_label_en"),
  ]);
  if (recipes.error) throw new Error(recipes.error.message);
  if (ingredients.error) throw new Error(ingredients.error.message);
  return {
    recipeNameEn: Object.fromEntries((recipes.data ?? []).map((r) => [r.name, r.name_en])),
    ingredientNameEs: Object.fromEntries((ingredients.data ?? []).map((i) => [i.name, i.name_es])),
    purchaseLabelEn: Object.fromEntries((ingredients.data ?? []).map((i) => [i.name, i.purchase_unit_label_en])),
  };
}

/** Translators for recipe/ingredient names coming from the DB, following the chosen language. */
export function useCatalogNames() {
  const { locale } = useSettings();
  const [translations, setTranslations] = useState<CatalogTranslations>(EMPTY_TRANSLATIONS);

  useEffect(() => {
    cached ??= loadTranslations().catch((error) => {
      cached = null; // retry on the next mount instead of caching the failure
      throw error;
    });
    cached.then(setTranslations).catch(() => {
      // Untranslated canonical names are an acceptable fallback; nothing else breaks.
    });
  }, []);

  return {
    recipe: (name: string) => recipeName(translations, locale, name),
    ingredient: (name: string) => ingredientName(translations, locale, name),
    purchaseLabel: (ingredient: string, label: string) => purchaseLabel(translations, locale, ingredient, label),
  };
}
