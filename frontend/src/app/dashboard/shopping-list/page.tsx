"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchActivePlan, type MealPlan } from "@/lib/mealPlan";
import { useSettings } from "@/lib/i18n/SettingsContext";
import { useDashboardUser } from "../UserContext";
import { ShoppingListTable, shoppingTotal } from "../_views/ShoppingListTable";

export default function ShoppingListPage() {
  const { id: userId } = useDashboardUser();
  const { t, formatMoney, formatDate } = useSettings();
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
        {t.shopping.noPlanBefore}{" "}
        <Link href="/dashboard/plan" className="underline">
          {t.shopping.generateOne}
        </Link>{" "}
        {t.shopping.noPlanAfter}
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">{t.shopping.title}</h1>
      <p className="text-sm text-gray-500">
        {t.shopping.fromActivePlan(formatMoney(shoppingTotal(plan.shopping_list)))}
        {plan.shopping_done_at && t.shopping.doneOn(formatDate(plan.shopping_done_at))}
      </p>
      <ShoppingListTable items={plan.shopping_list} />
    </div>
  );
}
