import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo root also has a package-lock.json (for the Supabase CLI devDependency),
  // which makes Next.js guess the workspace root wrong without this.
  turbopack: {
    root: path.join(__dirname),
  },
  // Old standalone pages moved inside the dashboard (especificaciones/01-specify.md,
  // module 5) -- keep bookmarked links working. /preferences used to host the login form.
  async redirects() {
    return [
      { source: "/preferences", destination: "/dashboard/preferences", permanent: false },
      { source: "/body-profile", destination: "/dashboard/body-profile", permanent: false },
      { source: "/targets", destination: "/dashboard/targets", permanent: false },
      { source: "/recipes", destination: "/dashboard/recipes", permanent: false },
      { source: "/plan", destination: "/dashboard/plan", permanent: false },
      { source: "/shopping-list", destination: "/dashboard/shopping-list", permanent: false },
    ];
  },
};

export default nextConfig;
