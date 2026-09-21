export type Weights = {
  cost: number;
  variety: number;
  prepTime: number;
};

const KEYS: (keyof Weights)[] = ["cost", "variety", "prepTime"];

/**
 * Adjust `key` to `newValue` (0-100) and redistribute the remainder across the
 * other two weights proportionally to their current share, so the three
 * always sum to exactly 100 — matching the DB's weights_sum_to_100 constraint.
 */
export function redistributeWeights(current: Weights, key: keyof Weights, newValue: number): Weights {
  const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
  const [a, b] = KEYS.filter((k) => k !== key);
  const otherSum = current[a] + current[b];
  const remainder = 100 - clamped;

  const next: Weights = { ...current, [key]: clamped };

  if (otherSum === 0) {
    // Nothing to scale proportionally: split the remainder evenly.
    next[a] = Math.floor(remainder / 2);
    next[b] = remainder - next[a];
  } else {
    next[a] = Math.round((current[a] / otherSum) * remainder);
    next[b] = remainder - next[a]; // absorbs rounding drift, guarantees an exact sum of 100
  }

  return next;
}
