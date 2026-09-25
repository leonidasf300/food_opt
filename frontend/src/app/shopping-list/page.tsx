"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LAST_PLAN_STORAGE_KEY = "food-opt:last-plan";

type ShoppingListItem = {
  ingredient_name: string;
  quantity_needed: number;
  purchase_unit_label: string | null;
  units_to_buy: number | null;
  cost: number | null;
};
type PlanResponse = {
  total_cost: number;
  shopping_list: ShoppingListItem[];
};

export default function ShoppingListPage() {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(LAST_PLAN_STORAGE_KEY);
        if (raw) setPlan(JSON.parse(raw));
      } catch {
        // localStorage puede fallar (modo privado) -- se muestra el estado vacío.
      } finally {
        setChecked(true);
      }
    });
  }, []);

  if (!checked) {
    return null;
  }

  if (!plan) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
        <p>
          Todavía no generaste ningún plan. Andá a{" "}
          <Link href="/plan" className="underline">
            Plan de comidas
          </Link>{" "}
          y generá uno primero.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Lista de compras</h1>
      <p className="text-sm text-gray-500">Del último plan generado. Costo total: ${plan.total_cost.toFixed(2)}.</p>

      <table className="w-full text-sm">
        <tbody>
          {plan.shopping_list.map((item) => (
            <tr key={item.ingredient_name} className="border-t">
              <td className="py-1 pr-2">{item.ingredient_name}</td>
              <td className="py-1 pr-2 text-gray-500">{item.quantity_needed} g</td>
              <td className="py-1 pr-2">
                {item.units_to_buy !== null
                  ? `${item.units_to_buy} × ${item.purchase_unit_label}`
                  : "sin precio cargado"}
              </td>
              <td className="py-1 text-right">{item.cost !== null ? `$${item.cost.toFixed(2)}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Link href="/plan" className="text-sm underline">
        ← Plan de comidas
      </Link>
    </main>
  );
}
