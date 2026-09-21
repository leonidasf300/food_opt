"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

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
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
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
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
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
    if (!userId) return;
    setErrorMessage(null);

    const prepTimeMinutes = Number(prepTime);
    if (!name.trim()) return setErrorMessage("El nombre no puede estar vacío.");
    if (Number.isNaN(prepTimeMinutes) || prepTimeMinutes <= 0) {
      return setErrorMessage("El tiempo de preparación debe ser un número mayor a 0.");
    }
    const validLines = lines.filter((line) => line.ingredientId && line.quantity);
    if (validLines.length === 0) return setErrorMessage("Agregá al menos un ingrediente.");
    for (const line of validLines) {
      if (Number.isNaN(Number(line.quantity)) || Number(line.quantity) <= 0) {
        return setErrorMessage("Las cantidades deben ser números mayores a 0.");
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
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la receta.");
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

  if (!authChecked) {
    return null;
  }

  if (!userId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
        <p>
          Iniciá sesión primero en{" "}
          <Link href="/preferences" className="underline">
            preferencias
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Recetas</h1>
      <p className="text-sm text-gray-500">
        Recetas base disponibles para el optimizador. Podés crear las tuyas — solo vos podés editar o borrar las que
        creaste; las recetas de muestra (sin dueño) son de solo lectura acá.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded border p-4">
        <div className="font-medium">{editingId ? "Editar receta" : "Nueva receta"}</div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Nombre"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="flex-1 rounded border px-3 py-2"
          />
          <input
            type="number"
            min={1}
            placeholder="Prep (min)"
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
                <option value="">Ingrediente...</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="any"
                placeholder="gramos"
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
            + agregar ingrediente
          </button>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear receta"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded border px-3 py-2">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {errorMessage && <p className="text-red-600">{errorMessage}</p>}

      <div className="flex flex-col gap-2">
        <div className="font-medium">{loading ? "Cargando..." : `${recipes.length} recetas`}</div>
        {recipes.map((recipe) => (
          <div key={recipe.id} className="rounded border p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{recipe.name}</div>
                <div className="text-sm text-gray-500">{recipe.prep_time_minutes} min de preparación</div>
                <ul className="mt-1 list-inside list-disc text-sm text-gray-700">
                  {recipe.recipe_ingredients.map((ri) => (
                    <li key={ri.ingredient_id}>
                      {ri.ingredients?.name ?? ri.ingredient_id} — {ri.quantity} g
                    </li>
                  ))}
                </ul>
              </div>
              {recipe.created_by === userId && (
                <div className="flex gap-2 text-sm">
                  <button type="button" onClick={() => startEdit(recipe)} className="underline">
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDelete(recipe.id)} className="text-red-600 underline">
                    Borrar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 text-sm">
        <Link href="/preferences" className="underline">
          ← Preferencias
        </Link>
        <Link href="/plan" className="underline">
          Generar plan →
        </Link>
      </div>
    </main>
  );
}
