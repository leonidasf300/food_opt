"use client";

import type { ShoppingListItem } from "@/lib/mealPlan";
import { useSettings } from "@/lib/i18n/SettingsContext";
import { INTL_LOCALE } from "@/lib/i18n/messages";
import { useCatalogNames } from "@/lib/i18n/useCatalogNames";

/** What actually gets paid, in COP: whole purchase units, not the plan's pro-rated recipe cost. */
export function shoppingTotal(items: ShoppingListItem[]): number {
  return items.reduce((sum, item) => sum + (item.cost ?? 0), 0);
}

export function ShoppingListTable({ items }: { items: ShoppingListItem[] }) {
  const { t, locale, currency, rate, formatMoney } = useSettings();
  const names = useCatalogNames();
  return (
    <div className="flex flex-col gap-2">
      <table className="w-full text-sm">
        <tbody>
          {items.map((item) => (
            <tr key={item.ingredient_name} className="border-t">
              <td className="py-1 pr-2">{names.ingredient(item.ingredient_name)}</td>
              <td className="py-1 pr-2 text-gray-500">{item.quantity_needed} g</td>
              <td className="py-1 pr-2">
                {item.units_to_buy !== null && item.purchase_unit_label !== null
                  ? `${item.units_to_buy} × ${names.purchaseLabel(item.ingredient_name, item.purchase_unit_label)}`
                  : t.shopping.noPrice}
              </td>
              <td className="whitespace-nowrap py-1 text-right">{item.cost !== null ? formatMoney(item.cost) : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-medium">
            <td className="py-1 pr-2" colSpan={3}>
              {t.shopping.totalToPay}
            </td>
            <td className="whitespace-nowrap py-1 text-right">{formatMoney(shoppingTotal(items))}</td>
          </tr>
        </tfoot>
      </table>
      {currency === "USD" && (
        <p className="text-xs text-gray-500">{t.common.exchangeNote(rate.toLocaleString(INTL_LOCALE[locale]))}</p>
      )}
    </div>
  );
}
