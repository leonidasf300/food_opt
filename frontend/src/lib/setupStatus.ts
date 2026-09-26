// First-visit guidance is derived from what's already saved, not from a separate
// "onboarded" flag -- so abandoning the wizard halfway resumes where it was left.
export type SetupStatus = {
  hasBodyProfile: boolean;
  hasTargets: boolean;
  hasPreferences: boolean;
  hasActivePlan: boolean;
};

// Wizard steps, 1-based to match what the user sees ("Paso 2 de 4").
// Preferences is optional (sensible defaults), so it never blocks the flow.
export const SETUP_STEP_COUNT = 4;

export function isStepComplete(status: SetupStatus, step: number): boolean {
  switch (step) {
    case 1:
      return status.hasBodyProfile;
    case 2:
      return status.hasTargets;
    case 3:
      return true;
    case 4:
      return status.hasActivePlan;
    default:
      return false;
  }
}

/** First step still missing, or null when setup is complete. */
export function firstIncompleteStep(status: SetupStatus): number | null {
  for (let step = 1; step <= SETUP_STEP_COUNT; step++) {
    if (!isStepComplete(status, step)) return step;
  }
  return null;
}
