"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchActivePlan, type MealPlan } from "@/lib/mealPlan";
import { useDashboardUser } from "../UserContext";
import { ShoppingListTable, shoppingTotal } from "../_views/ShoppingListTable";

export default function ShoppingListPage() {
  const { id: userId } = useDashboardUser();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [checked, setChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchActivePlan(userId)
      .then(setPlan)
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setChecked(true));
  }, [userId]);

  if (!checked) return null;
  if (errorMessage) return <p className="text-red-600">{errorMessage}</p>;

  if (!plan) {
    return (
      <p>
        Todavía no tenés un plan activo.{" "}
        <Link href="/dashboard/plan" className="underline">
          Generá uno
        </Link>{" "}
        primero.
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Lista de compras</h1>
      <p className="text-sm text-gray-500">
        Del plan activo. Total a pagar: ${shoppingTotal(plan.shopping_list).toFixed(2)}.
        {plan.shopping_done_at && ` Compras hechas el ${new Date(plan.shopping_done_at).toLocaleDateString("es-CO")}.`}
      </p>
      <ShoppingListTable items={plan.shopping_list} />
    </div>
  );
}
