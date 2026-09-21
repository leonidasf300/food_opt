import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo root also has a package-lock.json (for the Supabase CLI devDependency),
  // which makes Next.js guess the workspace root wrong without this.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
