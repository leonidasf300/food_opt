"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSetupStatus } from "@/lib/fetchSetupStatus";
import { firstIncompleteStep } from "@/lib/setupStatus";
import { useDashboardUser } from "./UserContext";

// Entry point after login: send the user to the guided setup if something's
// missing, otherwise straight to what they have to cook today.
export default function DashboardEntryPage() {
  const user = useDashboardUser();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSetupStatus(user.id)
      .then((status) => {
        const step = firstIncompleteStep(status);
        router.replace(step === null ? "/dashboard/today" : `/dashboard/setup?step=${step}`);
      })
      .catch((error: Error) => setErrorMessage(error.message));
  }, [user.id, router]);

  return errorMessage ? <p className="text-red-600">{errorMessage}</p> : <p className="text-sm text-gray-500">Cargando...</p>;
}
