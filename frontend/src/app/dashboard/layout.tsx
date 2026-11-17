"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSettings } from "@/lib/i18n/SettingsContext";
import { SettingsSwitcher } from "@/components/SettingsSwitcher";
import { DASHBOARD_GROUPS } from "./sections";
import { UserContext, type DashboardUser } from "./UserContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useSettings();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
      setAuthChecked(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authChecked && !user) router.replace("/login");
  }, [authChecked, user, router]);

  if (!authChecked || !user) {
    return null;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    // onAuthStateChange clears `user`, and the effect above sends us to /login.
  }

  // The wizard is its own focused flow -- no sidebar, so there's only one way forward.
  if (pathname === "/dashboard/setup") {
    return (
      <UserContext.Provider value={user}>
        <main className="flex flex-1 flex-col gap-4 p-6">
          <div className="mx-auto flex w-full max-w-2xl justify-end">
            <SettingsSwitcher />
          </div>
          {children}
        </main>
      </UserContext.Provider>
    );
  }

  return (
    <UserContext.Provider value={user}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="flex flex-col border-b md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <Link href="/dashboard" className="p-4 text-lg font-semibold">
            Food Opt
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:items-stretch md:gap-4 md:overflow-visible">
            {DASHBOARD_GROUPS.map((group) => (
              <div key={group.key} className="flex items-center gap-1 md:flex-col md:items-stretch">
                <span className="hidden px-3 text-xs font-medium uppercase tracking-wide text-gray-500 md:block">
                  {t.nav[group.label]}
                </span>
                {group.sections.map((section) => {
                  const active = pathname === section.href;
                  return (
                    <Link
                      key={section.key}
                      href={section.href}
                      className={`whitespace-nowrap rounded px-3 py-2 text-sm ${
                        active
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {t.nav[section.label]}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-xs text-gray-500 md:mt-auto md:flex-col md:items-start md:py-4">
            <SettingsSwitcher />
            <span className="truncate">{user.email}</span>
            <button type="button" onClick={handleSignOut} className="self-start underline">
              {t.nav.signOut}
            </button>
          </div>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </UserContext.Provider>
  );
}
