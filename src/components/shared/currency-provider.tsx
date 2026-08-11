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
  /** Convert a PHP amount into the selected display currency. */
  fromPhp: (amountPhp: number) => number;
  /** Convert an amount in the selected display currency back into PHP. */
  toPhp: (amount: number) => number;
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
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isCurrencyCode(stored)) {
        // One-time, mount-only sync from localStorage (empty deps array, runs
        // once, sets state at most once) — no cascading/looping render risk.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrencyState(stored);
      }
    } catch {
      // localStorage may be unavailable (privacy mode, sandboxed iframe, etc.)
      // Fall back to the default currency state.
    }
  }, []);

  function setCurrency(next: CurrencyCode) {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; in-memory state still updates.
    }
  }

  const value: CurrencyContextValue = {
    currency,
    setCurrency,
    format: (amountPhp: number) => formatCurrency(amountPhp, currency, initialRates),
    fromPhp: (amountPhp: number) => (currency === "PHP" ? amountPhp : amountPhp * initialRates[currency]),
    toPhp: (amount: number) => (currency === "PHP" ? amount : amount / initialRates[currency]),
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

/**
 * Like `useCurrency`, but returns `undefined` instead of throwing when
 * there's no `CurrencyProvider` ancestor. For shared components (e.g.
 * `ReportTable`) that are rendered both inside and outside the finance
 * section of the app.
 */
export function useCurrencyOptional(): CurrencyContextValue | undefined {
  return useContext(CurrencyContext);
}
