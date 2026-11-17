"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useSettings } from "@/lib/i18n/SettingsContext";
import { SettingsSwitcher } from "@/components/SettingsSwitcher";

export default function ResetPasswordPage() {
  const { t } = useSettings();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // The reset-password email link carries a recovery token in the URL fragment;
    // just instantiating the Supabase client (imported above) makes it process that
    // fragment (detectSessionInUrl) and fire this event once the recovery session
    // is live -- same mechanism the magic-link flow relies on.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Covers the case where the event already fired before this listener attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <SettingsSwitcher showCurrency={false} />
      <h1 className="text-xl font-semibold">{t.auth.resetTitle}</h1>

      {done ? (
        <>
          <p>{t.auth.resetDone}</p>
          <Link href="/login" className="underline">
            {t.auth.goToSignIn}
          </Link>
        </>
      ) : !ready ? (
        <p className="text-sm text-gray-500">{t.auth.verifyingLink}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            required
            minLength={6}
            placeholder={t.auth.newPasswordPlaceholder}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border px-3 py-2"
          />
          <button type="submit" disabled={saving} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
            {saving ? t.common.saving : t.auth.savePassword}
          </button>
        </form>
      )}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
    </main>
  );
}
