import type { Metadata } from "next";
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";
import { auth } from "@/auth";
import { AccessDenied } from "@/components/shared/access-denied";
import { CurrencyAmount } from "@/components/shared/currency-amount";
import {
  getRevenueTotal,
  getExpenseTotal,
  getCostOfServiceTotal,
  getCashFlow,
  getCashPosition,
  getOutstandingInvoicesTotal,
} from "@/lib/finance-calculations";
import { PeriodSelector } from "./period-selector";
import { SaveSnapshotButton } from "./save-snapshot-button";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Financial Statements" };

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-border/60 py-2 text-sm ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span><CurrencyAmount amountPhp={value} /></span>
    </div>
  );
}

export default async function FinancialStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; start?: string; end?: string }>;
}) {
  const session = await auth();
  if (session?.user.role === "STAFF") {
    return <AccessDenied message="Financial statements are restricted to Admin, Manager, and Finance Officer roles." />;
  }

  const params = await searchParams;
  const period = params.period ?? "monthly";
  const now = new Date();

  let range: { start: Date; end: Date };
  if (period === "quarterly") range = { start: startOfQuarter(now), end: endOfQuarter(now) };
  else if (period === "yearly") range = { start: startOfYear(now), end: endOfYear(now) };
  else if (period === "custom" && params.start && params.end) {
    range = { start: new Date(params.start), end: new Date(params.end) };
  } else range = { start: startOfMonth(now), end: endOfMonth(now) };

  const [revenue, totalExpenses, costOfService, cashFlow, cashPosition, accountsReceivable] = await Promise.all([
    getRevenueTotal(range),
    getExpenseTotal(range),
    getCostOfServiceTotal(range),
    getCashFlow(range),
    getCashPosition(range.end),
    getOutstandingInvoicesTotal(),
  ]);

  const grossProfit = revenue - costOfService;
  const operatingExpenses = totalExpenses - costOfService;
  const netProfit = grossProfit - operatingExpenses;

  const startStr = range.start.toISOString().slice(0, 10);
  const endStr = range.end.toISOString().slice(0, 10);

  const profitLossData = {
    revenue,
    costOfService,
    grossProfit,
    operatingExpenses,
    netProfit,
  };
  const balanceSheetData = {
    cash: cashPosition,
    accountsReceivable,
    liabilities: 0,
    equity: cashPosition + accountsReceivable,
  };
  const cashFlowData = { ...cashFlow };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Financial Statements</h1>
          <p className="text-sm text-muted-foreground">
            Computed live from recorded income and expenses for {startStr} to {endStr}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <PeriodSelector period={period} start={params.start ?? startStr} end={params.end ?? endStr} />
        </div>
      </div>

      <div className="rounded-xl border-t-[3px] border-t-blue-500 bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Profit &amp; Loss Statement</h2>
          <SaveSnapshotButton type="PROFIT_AND_LOSS" periodStart={startStr} periodEnd={endStr} data={profitLossData} />
        </div>
        <Row label="Revenue" value={revenue} />
        <Row label="Less: Cost of Services" value={-costOfService} />
        <Row label="Gross Profit" value={grossProfit} bold />
        <Row label="Operating Expenses" value={-operatingExpenses} />
        <Row label="Operating Income" value={grossProfit - operatingExpenses} />
        <Row label="Other Income" value={0} />
        <Row label="Other Expenses" value={0} />
        <Row label="Net Profit" value={netProfit} bold />
      </div>

      <div className="rounded-xl border-t-[3px] border-t-blue-500 bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Balance Sheet</h2>
          <SaveSnapshotButton type="BALANCE_SHEET" periodStart={startStr} periodEnd={endStr} data={balanceSheetData} />
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          As of {endStr}. Simplified cash-basis view — equipment, loans, and other non-cash assets/liabilities aren&apos;t tracked in this system.
        </p>
        <p className="mt-2 text-xs font-medium text-muted-foreground uppercase">Assets</p>
        <Row label="Cash" value={cashPosition} />
        <Row label="Accounts Receivable" value={accountsReceivable} />
        <Row label="Total Assets" value={cashPosition + accountsReceivable} bold />
        <p className="mt-3 text-xs font-medium text-muted-foreground uppercase">Liabilities &amp; Equity</p>
        <Row label="Liabilities (not tracked)" value={0} />
        <Row label="Owner's Equity" value={cashPosition + accountsReceivable} bold />
      </div>

      <div className="rounded-xl border-t-[3px] border-t-blue-500 bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Cash Flow Statement</h2>
          <SaveSnapshotButton type="CASH_FLOW" periodStart={startStr} periodEnd={endStr} data={cashFlowData} />
        </div>
        <p className="mt-2 text-xs font-medium text-muted-foreground uppercase">Operating Activities</p>
        <Row label="Cash In (payments received)" value={cashFlow.cashIn} />
        <Row label="Cash Out (expenses paid)" value={-cashFlow.cashOut} />
        <Row label="Net Operating Cash Flow" value={cashFlow.net} bold />
        <p className="mt-3 text-xs font-medium text-muted-foreground uppercase">Investing / Financing Activities</p>
        <Row label="Not tracked" value={0} />
        <Row label="Ending Cash Position" value={cashPosition} bold />
      </div>
    </div>
  );
}
