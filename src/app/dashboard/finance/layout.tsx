// src/app/dashboard/finance/layout.tsx
import { getExchangeRates } from "@/lib/exchange-rates";
import { CurrencyProvider } from "@/components/shared/currency-provider";
import { CurrencySelector } from "@/components/shared/currency-selector";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const rates = await getExchangeRates();

  return (
    <CurrencyProvider initialRates={rates}>
      <div className="mb-4 flex justify-end print:hidden">
        <CurrencySelector />
      </div>
      {children}
    </CurrencyProvider>
  );
}
