"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
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
      <h1 className="text-xl font-semibold">Elegir contraseña nueva</h1>

      {done ? (
        <>
          <p>Listo, ya podés iniciar sesión con tu contraseña nueva.</p>
          <Link href="/preferences" className="underline">
            Ir a iniciar sesión
          </Link>
        </>
      ) : !ready ? (
        <p className="text-sm text-gray-500">Verificando el link...</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            required
            minLength={6}
            placeholder="Contraseña nueva"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border px-3 py-2"
          />
          <button type="submit" disabled={saving} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
      )}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
    </main>
  );
}
