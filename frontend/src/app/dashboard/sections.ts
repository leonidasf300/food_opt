// Secciones del dashboard, agrupadas por fase (ver módulo 5 en especificaciones/01-specify.md).
export type DashboardSection = {
  key: string;
  label: string;
  href: string;
};

export type DashboardGroup = {
  key: string;
  label: string;
  sections: DashboardSection[];
};

export const DASHBOARD_GROUPS: DashboardGroup[] = [
  {
    key: "tracking",
    label: "Seguimiento",
    sections: [
      { key: "today", label: "Hoy", href: "/dashboard/today" },
      { key: "shopping-list", label: "Lista de compras", href: "/dashboard/shopping-list" },
    ],
  },
  {
    key: "planning",
    label: "Planeación",
    sections: [
      { key: "body-profile", label: "1. Perfil corporal", href: "/dashboard/body-profile" },
      { key: "targets", label: "2. Objetivos nutricionales", href: "/dashboard/targets" },
      { key: "preferences", label: "3. Preferencias", href: "/dashboard/preferences" },
      { key: "plan", label: "4. Generar plan", href: "/dashboard/plan" },
    ],
  },
  {
    key: "library",
    label: "Biblioteca",
    sections: [{ key: "recipes", label: "Recetas", href: "/dashboard/recipes" }],
  },
];
