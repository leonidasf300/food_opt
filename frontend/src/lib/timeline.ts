// Seguimiento timeline: step 0 is shopping, then one step per plan day. Progress is
// by sequence, not by calendar -- "today" is simply the first step not done yet, so
// skipping a day never throws the plan out of sync (especificaciones/01-specify.md, module 5).

export type StepStatus = "done" | "current" | "pending";

export type TimelineStep =
  | { kind: "shopping"; index: number; status: StepStatus; completedAt: string | null }
  | {
      kind: "day";
      index: number;
      status: StepStatus;
      completedAt: string | null;
      dayId: string;
      dayNumber: number;
      servings: Record<string, number>;
    };

type TimelineInput = {
  shopping_done_at: string | null;
  meal_plan_days: { id: string; day_index: number; servings: Record<string, number>; completed_at: string | null }[];
};

export function buildTimeline(plan: TimelineInput): TimelineStep[] {
  const raw = [
    { kind: "shopping" as const, completedAt: plan.shopping_done_at },
    ...[...plan.meal_plan_days]
      .sort((a, b) => a.day_index - b.day_index)
      .map((day) => ({
        kind: "day" as const,
        completedAt: day.completed_at,
        dayId: day.id,
        dayNumber: day.day_index + 1,
        servings: day.servings,
      })),
  ];

  const current = raw.findIndex((step) => step.completedAt === null);
  return raw.map((step, index) => ({
    ...step,
    index,
    status: step.completedAt !== null ? "done" : index === current ? "current" : "pending",
  })) as TimelineStep[];
}

/** Index of the step to show on open: the current one, or the last one if everything is done. */
export function currentStepIndex(steps: TimelineStep[]): number {
  const current = steps.findIndex((step) => step.status === "current");
  return current === -1 ? steps.length - 1 : current;
}

/** Only the most recently completed step can be undone, so the sequence never gets holes. */
export function canUndo(steps: TimelineStep[], index: number): boolean {
  const lastDone = steps.map((step) => step.status).lastIndexOf("done");
  return index === lastDone && steps.slice(index + 1).every((step) => step.status !== "done");
}
