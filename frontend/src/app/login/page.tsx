"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
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
      <h1 className="text-xl font-semibold">{authMode === "signup" ? "Crear cuenta" : "Iniciar sesión"}</h1>
      <form onSubmit={handleAuth} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="tu@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded border px-3 py-2"
        />
        <button type="submit" disabled={authLoading} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
          {authLoading ? "..." : authMode === "signup" ? "Crear cuenta" : "Entrar"}
        </button>
      </form>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <button
          type="button"
          onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}
          className="underline"
        >
          {authMode === "signup" ? "Ya tengo cuenta" : "Crear cuenta nueva"}
        </button>
        <Link href="/forgot-password" className="underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
    </main>
  );
}
