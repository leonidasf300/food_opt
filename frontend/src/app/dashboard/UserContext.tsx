"use client";

import { createContext, useContext } from "react";

export type DashboardUser = { id: string; email: string | null };

export const UserContext = createContext<DashboardUser | null>(null);

/** Signed-in user for any page under /dashboard -- the layout guarantees one exists. */
export function useDashboardUser(): DashboardUser {
  const user = useContext(UserContext);
  if (!user) throw new Error("useDashboardUser must be used inside the dashboard layout");
  return user;
}
