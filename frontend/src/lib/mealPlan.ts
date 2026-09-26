import { supabase } from "@/lib/supabase/client";

// Shapes returned by the optimization backend (POST /plans).
export type DayPlan = { day: number; servings: Record<string, number> };
export type ShoppingListItem = {
  ingredient_name: string;
  quantity_needed: number;
  purchase_unit_label: string | null;
  units_to_buy: number | null;
  cost: number | null;
};
export type PlanResponse = {
  status: string;
  total_cost: number;
  total_prep_time_minutes: number;
  recipes_used: string[];
  days: DayPlan[];
  shopping_list: ShoppingListItem[];
};

// Persisted plan (tables meal_plans / meal_plan_days).
export type MealPlanDay = {
  id: string;
  day_index: number;
  servings: Record<string, number>;
  completed_at: string | null;
};
export type MealPlan = {
  id: string;
  num_days: number;
  total_cost: number;
  total_prep_time_minutes: number;
  shopping_list: ShoppingListItem[];
  shopping_done_at: string | null;
  created_at: string;
  meal_plan_days: MealPlanDay[];
};

/** The user's active (non-archived) plan, days sorted, or null if there's none. */
export async function fetchActivePlan(userId: string): Promise<MealPlan | null> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select(
      "id, num_days, total_cost, total_prep_time_minutes, shopping_list, shopping_done_at, created_at, meal_plan_days (id, day_index, servings, completed_at)"
    )
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const plan = data as MealPlan;
  plan.meal_plan_days = [...plan.meal_plan_days].sort((a, b) => a.day_index - b.day_index);
  return plan;
}

/** Archives the current active plan and stores `plan` as the new one (atomic, see save_meal_plan). */
export async function saveActivePlan(plan: PlanResponse): Promise<void> {
  const { error } = await supabase.rpc("save_meal_plan", { plan });
  if (error) throw new Error(error.message);
}
