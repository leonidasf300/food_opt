"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setSending(true);
    // Same explicit-redirect reasoning as the preferences page's auth form: the
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
      <h1 className="text-xl font-semibold">Restablecer contraseña</h1>
      {sent ? (
        <p>Revisá tu email: te mandamos un link para elegir una contraseña nueva.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border px-3 py-2"
          />
          <button type="submit" disabled={sending} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
            {sending ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      )}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
      <Link href="/preferences" className="text-sm underline">
        ← Volver a iniciar sesión
      </Link>
    </main>
  );
}
