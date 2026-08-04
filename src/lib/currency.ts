// src/lib/currency.ts
import type { Rates } from "./exchange-rates";

export type CurrencyCode = "PHP" | "USD" | "EUR";

export const CURRENCY_CODES: CurrencyCode[] = ["PHP", "USD", "EUR"];

const LOCALE_BY_CURRENCY: Record<CurrencyCode, string> = {
  PHP: "en-PH",
  USD: "en-US",
  EUR: "en-IE", // English-speaking eurozone locale: "€1,234.56"
};

export function formatCurrency(amountPhp: number, currency: CurrencyCode, rates: Rates): string {
  const converted = currency === "PHP" ? amountPhp : amountPhp * rates[currency];
  return converted.toLocaleString(LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
  });
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCY_CODES as string[]).includes(value);
}
