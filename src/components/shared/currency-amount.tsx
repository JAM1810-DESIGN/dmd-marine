"use client";

import { useCurrency } from "./currency-provider";

export function CurrencyAmount({ amountPhp }: { amountPhp: number }) {
  const { format } = useCurrency();
  return <>{format(amountPhp)}</>;
}
