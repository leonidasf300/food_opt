"use client";

import Link from "next/link";
import { SettingsSwitcher } from "@/components/SettingsSwitcher";
import { useSettings } from "@/lib/i18n/SettingsContext";

export default function Home() {
  const { t } = useSettings();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-4 p-6">
      <SettingsSwitcher showCurrency={false} />
      <h1 className="text-2xl font-semibold">Food Opt</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{t.home.tagline}</p>
      <Link href="/dashboard" className="rounded bg-black px-4 py-2 text-white">
        {t.home.enter}
      </Link>
    </main>
  );
}
