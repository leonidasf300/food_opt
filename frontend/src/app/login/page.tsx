"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useSettings } from "@/lib/i18n/SettingsContext";
import { SettingsSwitcher } from "@/components/SettingsSwitcher";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useSettings();
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Already signed in -- /dashboard decides between the setup wizard and today's step.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/dashboard");
    });
  }, [router]);

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setAuthLoading(true);
    const { error } =
      authMode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <SettingsSwitcher showCurrency={false} />
      <h1 className="text-xl font-semibold">{authMode === "signup" ? t.auth.signUpTitle : t.auth.signInTitle}</h1>
      <form onSubmit={handleAuth} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder={t.auth.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder={t.auth.passwordPlaceholder}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded border px-3 py-2"
        />
        <button type="submit" disabled={authLoading} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
          {authLoading ? "..." : authMode === "signup" ? t.auth.signUpButton : t.auth.signInButton}
        </button>
      </form>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <button
          type="button"
          onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}
          className="underline"
        >
          {authMode === "signup" ? t.auth.haveAccount : t.auth.createAccount}
        </button>
        <Link href="/forgot-password" className="underline">
          {t.auth.forgotLink}
        </Link>
      </div>

      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
    </main>
  );
}
