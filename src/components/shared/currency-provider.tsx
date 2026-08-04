// src/components/shared/currency-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Rates } from "@/lib/exchange-rates";
import { type CurrencyCode, formatCurrency, isCurrencyCode } from "@/lib/currency";

const STORAGE_KEY = "dmd-currency";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  format: (amountPhp: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({
  children,
  initialRates,
}: {
  children: React.ReactNode;
  initialRates: Rates;
}) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("PHP");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isCurrencyCode(stored)) {
      setCurrencyState(stored);
    }
  }, []);

  function setCurrency(next: CurrencyCode) {
    setCurrencyState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  const value: CurrencyContextValue = {
    currency,
    setCurrency,
    format: (amountPhp: number) => formatCurrency(amountPhp, currency, initialRates),
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
