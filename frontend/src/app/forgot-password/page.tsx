"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useSettings } from "@/lib/i18n/SettingsContext";
import { SettingsSwitcher } from "@/components/SettingsSwitcher";

export default function ForgotPasswordPage() {
  const { t } = useSettings();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setSending(true);
    // Same explicit-redirect reasoning as the old magic-link login: the
    // target page must itself import the Supabase client so it processes the
    // recovery link's #access_token fragment (detectSessionInUrl).
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <SettingsSwitcher showCurrency={false} />
      <h1 className="text-xl font-semibold">{t.auth.forgotTitle}</h1>
      {sent ? (
        <p>{t.auth.forgotSent}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder={t.auth.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border px-3 py-2"
          />
          <button type="submit" disabled={sending} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
            {sending ? t.auth.sending : t.auth.sendLink}
          </button>
        </form>
      )}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
      <Link href="/login" className="text-sm underline">
        {t.auth.backToSignIn}
      </Link>
    </main>
  );
}
