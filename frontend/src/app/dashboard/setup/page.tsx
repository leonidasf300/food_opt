"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchSetupStatus } from "@/lib/fetchSetupStatus";
import { firstIncompleteStep, isStepComplete, SETUP_STEP_COUNT, type SetupStatus } from "@/lib/setupStatus";
import { useDashboardUser } from "../UserContext";
import { BodyProfileView } from "../_views/BodyProfileView";
import { TargetsView } from "../_views/TargetsView";
import { PreferencesView } from "../_views/PreferencesView";
import { PlanView } from "../_views/PlanView";

const STEPS = [
  {
    title: "Perfil corporal",
    intro: "Empecemos por vos. Con tus medidas calculamos cuánto necesitás comer por día.",
  },
  {
    title: "Objetivos nutricionales",
    intro: "Ya calculamos tus rangos diarios a partir de tu perfil. Revisalos y guardalos, o personalizalos si querés.",
  },
  {
    title: "Preferencias",
    intro: "¿Qué te importa más: gastar poco, comer variado o cocinar rápido? Es opcional, podés usar los valores recomendados.",
  },
  {
    title: "Generar plan",
    intro: "Último paso: elegí para cuántos días y generamos tu plan de comidas con su lista de compras.",
  },
];

function SetupWizard() {
  const { id: userId } = useDashboardUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requested = Number(searchParams.get("step"));
  const step = requested >= 1 && requested <= SETUP_STEP_COUNT ? requested : status ? (firstIncompleteStep(status) ?? 1) : 1;

  const refreshStatus = useCallback(
    () =>
      fetchSetupStatus(userId)
        .then(setStatus)
        .catch((error: Error) => setErrorMessage(error.message)),
    [userId]
  );

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  function goTo(next: number) {
    router.replace(`/dashboard/setup?step=${next}`);
  }

  async function handleStepSaved() {
    await refreshStatus();
    if (step < SETUP_STEP_COUNT) goTo(step + 1);
    else router.replace("/dashboard/today");
  }

  if (!status) return errorMessage ? <p className="text-red-600">{errorMessage}</p> : null;

  const current = STEPS[step - 1];
  const canContinue = isStepComplete(status, step);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-500">
            Paso {step} de {SETUP_STEP_COUNT}
          </span>
          <Link href="/dashboard/today" className="text-xs text-gray-500 underline">
            Salir del asistente
          </Link>
        </div>
        <ol className="grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n !== 3 ? isStepComplete(status, n) : status.hasPreferences;
            return (
              <li key={s.title} className="flex flex-col gap-1">
                <div
                  className={`h-1.5 rounded-full ${
                    n === step ? "bg-black dark:bg-white" : done ? "bg-green-600" : "bg-gray-200 dark:bg-zinc-800"
                  }`}
                />
                <span className={`hidden text-xs sm:block ${n === step ? "font-medium" : "text-gray-500"}`}>{s.title}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="rounded bg-gray-50 p-3 text-sm dark:bg-zinc-900">{current.intro}</p>

      {step === 1 && <BodyProfileView onSaved={handleStepSaved} />}
      {step === 2 && <TargetsView onSaved={handleStepSaved} />}
      {step === 3 && <PreferencesView onSaved={handleStepSaved} />}
      {step === 4 && <PlanView onSaved={handleStepSaved} />}

      <div className="flex items-center justify-between border-t pt-4">
        <button
          type="button"
          onClick={() => goTo(step - 1)}
          disabled={step === 1}
          className="rounded border px-4 py-2 disabled:opacity-30"
        >
          ← Atrás
        </button>
        {step === 3 && !status.hasPreferences ? (
          <button type="button" onClick={() => goTo(4)} className="rounded border px-4 py-2">
            Usar valores recomendados →
          </button>
        ) : step < SETUP_STEP_COUNT ? (
          <button
            type="button"
            onClick={() => goTo(step + 1)}
            disabled={!canContinue}
            title={canContinue ? undefined : "Guardá este paso para continuar"}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-30 dark:bg-white dark:text-black"
          >
            Siguiente →
          </button>
        ) : (
          canContinue && (
            <Link href="/dashboard/today" className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
              Ir a mi seguimiento →
            </Link>
          )
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  // useSearchParams needs a Suspense boundary for the static build.
  return (
    <Suspense>
      <SetupWizard />
    </Suspense>
  );
}
