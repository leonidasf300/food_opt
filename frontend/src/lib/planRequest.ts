// Pure helpers for talking to the optimization backend (POST /plans). Kept free of the
// Supabase client so they can be unit-tested on their own.

/** Same range the backend enforces (PlanRequest.num_days: gt=0, le=14). */
export const MIN_PLAN_DAYS = 1;
export const MAX_PLAN_DAYS = 14;

export function isValidNumDays(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_PLAN_DAYS && value <= MAX_PLAN_DAYS;
}

/**
 * Turns the `detail` of a backend error response into text that's safe to render.
 *
 * FastAPI sends `detail` as a plain string for errors raised by our own code
 * (HTTPException), but as an array of `{ loc, msg, ... }` objects for request
 * validation errors. Rendering that array directly crashes React ("Objects are not
 * valid as a React child"), so it must always go through here. Returns null when
 * there's nothing usable, so the caller can fall back to a generic message.
 */
export function backendErrorText(detail: unknown): string | null {
  if (typeof detail === "string") return detail.trim() || null;
  if (!Array.isArray(detail)) return null;

  const parts = detail
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (!entry || typeof entry !== "object") return null;
      const { loc, msg } = entry as { loc?: unknown; msg?: unknown };
      if (typeof msg !== "string") return null;
      // loc is e.g. ["body", "nutrient_targets", "calories"]; "body" adds nothing.
      const where = Array.isArray(loc) ? loc.filter((part) => part !== "body").join(".") : "";
      return where ? `${where}: ${msg}` : msg;
    })
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join("; ") : null;
}
