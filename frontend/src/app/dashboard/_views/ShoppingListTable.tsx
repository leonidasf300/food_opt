import type { ShoppingListItem } from "@/lib/mealPlan";

/** What actually gets paid: whole purchase units, not the plan's pro-rated recipe cost. */
export function shoppingTotal(items: ShoppingListItem[]): number {
  return items.reduce((sum, item) => sum + (item.cost ?? 0), 0);
}

export function ShoppingListTable({ items }: { items: ShoppingListItem[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {items.map((item) => (
          <tr key={item.ingredient_name} className="border-t">
            <td className="py-1 pr-2">{item.ingredient_name}</td>
            <td className="py-1 pr-2 text-gray-500">{item.quantity_needed} g</td>
            <td className="py-1 pr-2">
              {item.units_to_buy !== null ? `${item.units_to_buy} × ${item.purchase_unit_label}` : "sin precio cargado"}
            </td>
            <td className="py-1 text-right">{item.cost !== null ? `$${item.cost.toFixed(2)}` : "—"}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t font-medium">
          <td className="py-1 pr-2" colSpan={3}>
            Total a pagar
          </td>
          <td className="py-1 text-right">${shoppingTotal(items).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
