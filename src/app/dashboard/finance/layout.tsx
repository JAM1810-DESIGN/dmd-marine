// src/app/dashboard/finance/layout.tsx
import { getExchangeRates } from "@/lib/exchange-rates";
import { CurrencyProvider } from "@/components/shared/currency-provider";
import { CurrencySelector } from "@/components/shared/currency-selector";
import { FinanceNav } from "./finance-nav";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const rates = await getExchangeRates();

  return (
    <CurrencyProvider initialRates={rates}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <FinanceNav />
          </div>
          <div className="shrink-0 print:hidden">
            <CurrencySelector />
          </div>
        </div>
      </div>
      {children}
    </CurrencyProvider>
  );
}
