"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { useSettings } from "@/lib/i18n/SettingsContext";
import { useCatalogNames } from "@/lib/i18n/useCatalogNames";
import { useDashboardUser } from "../UserContext";

type Ingredient = { id: string; name: string };

type RecipeIngredientRow = { ingredient_id: string; quantity: number; ingredients: { name: string } | null };

type Recipe = {
  id: string;
  name: string;
  prep_time_minutes: number;
  created_by: string | null;
  recipe_ingredients: RecipeIngredientRow[];
};

type DraftLine = { ingredientId: string; quantity: string };

const EMPTY_LINE: DraftLine = { ingredientId: "", quantity: "" };

export default function RecipesPage() {
  const { id: userId } = useDashboardUser();
  const { t } = useSettings();
  const r = t.recipes;
  const names = useCatalogNames();
  const byDisplayName = <T,>(items: T[], name: (item: T) => string) =>
    [...items].sort((a, b) => name(a).localeCompare(name(b)));
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [prepTime, setPrepTime] = useState("15");
  const [lines, setLines] = useState<DraftLine[]>([EMPTY_LINE]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("ingredients")
      .select("id, name")
      .order("name")
      .then(({ data, error }) => {
        if (error) return setErrorMessage(error.message);
        setIngredients(data ?? []);
      });
    loadRecipes();
  }, [userId]);

  function loadRecipes() {
    setLoading(true);
    supabase
      .from("recipes")
      .select("id, name, prep_time_minutes, created_by, recipe_ingredients(ingredient_id, quantity, ingredients(name))")
      .order("name")
      .then(({ data, error }) => {
        setLoading(false);
        if (error) return setErrorMessage(error.message);
        setRecipes((data as unknown as Recipe[]) ?? []);
      });
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setPrepTime("15");
    setLines([EMPTY_LINE]);
  }

  function startEdit(recipe: Recipe) {
    setEditingId(recipe.id);
    setName(recipe.name);
    setPrepTime(String(recipe.prep_time_minutes));
    setLines(
      recipe.recipe_ingredients.length > 0
        ? recipe.recipe_ingredients.map((ri) => ({ ingredientId: ri.ingredient_id, quantity: String(ri.quantity) }))
        : [EMPTY_LINE]
    );
    setErrorMessage(null);
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, EMPTY_LINE]);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    const prepTimeMinutes = Number(prepTime);
    if (!name.trim()) return setErrorMessage(r.emptyName);
    if (Number.isNaN(prepTimeMinutes) || prepTimeMinutes <= 0) {
      return setErrorMessage(r.badPrepTime);
    }
    const validLines = lines.filter((line) => line.ingredientId && line.quantity);
    if (validLines.length === 0) return setErrorMessage(r.noIngredients);
    for (const line of validLines) {
      if (Number.isNaN(Number(line.quantity)) || Number(line.quantity) <= 0) {
        return setErrorMessage(r.badQuantity);
      }
    }

    setSaving(true);
    try {
      let recipeId = editingId;
      if (recipeId) {
        const { error } = await supabase
          .from("recipes")
          .update({ name: name.trim(), prep_time_minutes: prepTimeMinutes })
          .eq("id", recipeId);
        if (error) throw error;
        const { error: deleteError } = await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
        if (deleteError) throw deleteError;
      } else {
        const { data, error } = await supabase
          .from("recipes")
          .insert({ name: name.trim(), prep_time_minutes: prepTimeMinutes, created_by: userId })
          .select("id")
          .single();
        if (error) throw error;
        recipeId = data.id;
      }

      const { error: insertError } = await supabase.from("recipe_ingredients").insert(
        validLines.map((line) => ({
          recipe_id: recipeId,
          ingredient_id: line.ingredientId,
          quantity: Number(line.quantity),
          unit: "g",
        }))
      );
      if (insertError) throw insertError;

      resetForm();
      loadRecipes();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : r.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(recipeId: string) {
    setErrorMessage(null);
    const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
    if (error) return setErrorMessage(error.message);
    if (editingId === recipeId) resetForm();
    loadRecipes();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold">{r.title}</h1>
      <p className="text-sm text-gray-500">{r.intro}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded border p-4">
        <div className="font-medium">{editingId ? r.editRecipe : r.newRecipe}</div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder={r.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="flex-1 rounded border px-3 py-2"
          />
          <input
            type="number"
            min={1}
            placeholder={r.prepMinutes}
            value={prepTime}
            onChange={(event) => setPrepTime(event.target.value)}
            className="w-32 rounded border px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-2">
          {lines.map((line, index) => (
            <div key={index} className="flex gap-2">
              <select
                value={line.ingredientId}
                onChange={(event) => updateLine(index, { ingredientId: event.target.value })}
                className="flex-1 rounded border px-3 py-2"
              >
                <option value="">{r.ingredient}</option>
                {byDisplayName(ingredients, (i) => names.ingredient(i.name)).map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {names.ingredient(ingredient.name)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="any"
                placeholder={r.grams}
                value={line.quantity}
                onChange={(event) => updateLine(index, { quantity: event.target.value })}
                className="w-28 rounded border px-3 py-2"
              />
              <button
                type="button"
                onClick={() => removeLine(index)}
                disabled={lines.length === 1}
                className="rounded border px-3 py-2 disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" onClick={addLine} className="self-start text-sm underline">
            {r.addIngredient}
          </button>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
            {saving ? t.common.saving : editingId ? r.saveChanges : r.create}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded border px-3 py-2">
              {t.common.cancel}
            </button>
          )}
        </div>
      </form>

      {errorMessage && <p className="text-red-600">{errorMessage}</p>}

      <div className="flex flex-col gap-2">
        <div className="font-medium">{loading ? t.common.loading : r.count(recipes.length)}</div>
        {byDisplayName(recipes, (rec) => names.recipe(rec.name)).map((recipe) => (
          <div key={recipe.id} className="rounded border p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{recipe.created_by === null ? names.recipe(recipe.name) : recipe.name}</div>
                <div className="text-sm text-gray-500">{r.prepTime(recipe.prep_time_minutes)}</div>
                <ul className="mt-1 list-inside list-disc text-sm text-gray-700">
                  {recipe.recipe_ingredients.map((ri) => (
                    <li key={ri.ingredient_id}>
                      {ri.ingredients ? names.ingredient(ri.ingredients.name) : ri.ingredient_id} — {ri.quantity} g
                    </li>
                  ))}
                </ul>
              </div>
              {recipe.created_by === userId && (
                <div className="flex gap-2 text-sm">
                  <button type="button" onClick={() => startEdit(recipe)} className="underline">
                    {t.common.edit}
                  </button>
                  <button type="button" onClick={() => handleDelete(recipe.id)} className="text-red-600 underline">
                    {t.common.delete}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
