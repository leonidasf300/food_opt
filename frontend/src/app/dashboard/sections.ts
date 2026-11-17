// Secciones del dashboard, agrupadas por fase (ver módulo 5 en especificaciones/01-specify.md).
// Labels are keys into the `nav` messages, so the sidebar follows the chosen language.
import type { Messages } from "@/lib/i18n/messages";

type NavKey = keyof Messages["nav"];

export type DashboardSection = {
  key: string;
  label: NavKey;
  href: string;
};

export type DashboardGroup = {
  key: string;
  label: NavKey;
  sections: DashboardSection[];
};

export const DASHBOARD_GROUPS: DashboardGroup[] = [
  {
    key: "tracking",
    label: "tracking",
    sections: [
      { key: "today", label: "today", href: "/dashboard/today" },
      { key: "shopping-list", label: "shoppingList", href: "/dashboard/shopping-list" },
    ],
  },
  {
    key: "planning",
    label: "planning",
    sections: [
      { key: "body-profile", label: "bodyProfile", href: "/dashboard/body-profile" },
      { key: "targets", label: "targets", href: "/dashboard/targets" },
      { key: "preferences", label: "preferences", href: "/dashboard/preferences" },
      { key: "plan", label: "plan", href: "/dashboard/plan" },
    ],
  },
  {
    key: "library",
    label: "library",
    sections: [{ key: "recipes", label: "recipes", href: "/dashboard/recipes" }],
  },
];
