import { describe, expect, it } from "vitest";
import { firstIncompleteStep, type SetupStatus } from "./setupStatus";

const NOTHING: SetupStatus = { hasBodyProfile: false, hasTargets: false, hasPreferences: false, hasActivePlan: false };

describe("firstIncompleteStep", () => {
  it("starts at the body profile for a brand-new user", () => {
    expect(firstIncompleteStep(NOTHING)).toBe(1);
  });

  it("resumes at targets once the body profile exists", () => {
    expect(firstIncompleteStep({ ...NOTHING, hasBodyProfile: true })).toBe(2);
  });

  it("skips optional preferences and goes to plan generation", () => {
    expect(firstIncompleteStep({ ...NOTHING, hasBodyProfile: true, hasTargets: true })).toBe(4);
  });

  it("is done once there's an active plan", () => {
    expect(firstIncompleteStep({ hasBodyProfile: true, hasTargets: true, hasPreferences: false, hasActivePlan: true })).toBeNull();
  });
});
