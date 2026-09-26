import { supabase } from "@/lib/supabase/client";
import type { SetupStatus } from "./setupStatus";

// Kept apart from setupStatus.ts so the pure step logic stays testable without a Supabase client.
export async function fetchSetupStatus(userId: string): Promise<SetupStatus> {
  const [bodyProfiles, targets, preferences, plans] = await Promise.all([
    supabase.from("body_profiles").select("user_id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("user_nutrient_targets").select("user_id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("preferences").select("user_id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("meal_plans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("archived_at", null),
  ]);
  for (const res of [bodyProfiles, targets, preferences, plans]) {
    if (res.error) throw new Error(res.error.message);
  }
  return {
    hasBodyProfile: (bodyProfiles.count ?? 0) > 0,
    hasTargets: (targets.count ?? 0) > 0,
    hasPreferences: (preferences.count ?? 0) > 0,
    hasActivePlan: (plans.count ?? 0) > 0,
  };
}
