// Every price in the DB (ingredients.purchase_unit_price, plan costs, shopping list)
// is stored in Colombian pesos -- real exito.com retail prices, see
// especificaciones/00-constitution.md. USD is a display-only conversion at a fixed,
// configurable rate; nothing is ever stored in USD.

export type Currency = "COP" | "USD";

export const CURRENCIES: Currency[] = ["COP", "USD"];

/** Approximate pesos per dollar. Override with NEXT_PUBLIC_COP_PER_USD; not a live feed. */
export const DEFAULT_COP_PER_USD = 4000;

export function copPerUsd(): number {
  const fromEnv = Number(process.env.NEXT_PUBLIC_COP_PER_USD);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_COP_PER_USD;
}

export function convertFromCop(amountCop: number, currency: Currency, rate: number): number {
  return currency === "COP" ? amountCop : amountCop / rate;
}

/**
 * Formats a COP amount in the chosen currency. Pesos have no meaningful cents at
 * these prices, so COP shows whole numbers; USD keeps two decimals.
 */
export function formatMoney(amountCop: number, currency: Currency, numberLocale: string, rate: number): string {
  const amount = convertFromCop(amountCop, currency, rate);
  const digits = currency === "COP" ? 0 : 2;
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}
