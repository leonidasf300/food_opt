"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { redistributeWeights, type Weights } from "@/lib/preferences";

const DEFAULT_WEIGHTS: Weights = { cost: 34, variety: 33, prepTime: 33 };

const SLIDERS: { key: keyof Weights; label: string }[] = [
  { key: "cost", label: "Costo" },
  { key: "variety", label: "Variedad" },
  { key: "prepTime", label: "Tiempo de preparación" },
];

type AuthMode = "signin" | "signup";

export default function PreferencesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("preferences")
      .select("weight_cost, weight_variety, weight_prep_time")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        if (data) {
          setWeights({ cost: data.weight_cost, variety: data.weight_variety, prepTime: data.weight_prep_time });
        }
      });
  }, [userId]);

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
    // onAuthStateChange picks up the new session and flips userId -- no manual redirect needed.
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    setErrorMessage(null);
    const { error } = await supabase.from("preferences").upsert({
      user_id: userId,
      weight_cost: weights.cost,
      weight_variety: weights.variety,
      weight_prep_time: weights.prepTime,
    });
    setSaving(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSaved(true);
  }

  if (!authChecked) {
    return null;
  }

  if (!userId) {
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

        <div className="flex justify-between text-sm">
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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Preferencias</h1>
      <p className="text-sm text-gray-500">
        Ajustá cuánto pesa cada objetivo. Siempre suman 100% — mover uno redistribuye los otros dos.
      </p>

      {SLIDERS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span>{label}</span>
            <span>{weights[key]}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={weights[key]}
            onChange={(event) => setWeights((current) => redistributeWeights(current, key, Number(event.target.value)))}
            className="w-full"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>

      {saved && <p className="text-green-600">Guardado.</p>}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}

      <div className="flex gap-4 text-sm">
        <Link href="/targets" className="underline">
          Objetivos nutricionales →
        </Link>
        <Link href="/recipes" className="underline">
          Recetas →
        </Link>
        <Link href="/plan" className="underline">
          Generar plan →
        </Link>
      </div>
    </main>
  );
}
