import type { Metadata } from "next";
import Link from "next/link";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from "date-fns";
import { AlertTriangle, ArrowUpRight, ArrowDownRight, FileText, Receipt } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { CurrencyAmount } from "@/components/shared/currency-amount";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getRevenueTotal,
  getExpenseTotal,
  getCostOfServiceTotal,
  getOutstandingInvoicesTotal,
  getPaidInvoicesTotal,
  getCashFlow,
  getRevenueByService,
  getExpenseByCategory,
  getReceivableAging,
  getMonthlySeries,
  getAnnualSeries,
} from "@/lib/finance-calculations";
import { refreshOverdueInvoices } from "./invoices/actions";
import {
  MonthlyBarChart,
  RevenueVsExpensesChart,
  YearlyTrendChart,
  BreakdownPieChart,
} from "./finance-charts";

export const metadata: Metadata = { title: "Finance" };

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export default async function FinanceDashboardPage() {
  const session = await auth();
  if (session?.user.role === "STAFF") {
    return <AccessDenied message="Finance overview is restricted to Admin, Manager, and Finance Officer roles." />;
  }

  await refreshOverdueInvoices();

  const now = new Date();
  const monthRange = { start: startOfMonth(now), end: endOfMonth(now) };
  const yearRange = { start: startOfYear(now), end: endOfYear(now) };
  const lastYearRange = { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) };

  const [
    totalRevenue,
    totalExpenses,
    costOfService,
    monthlyRevenue,
    monthlyExpenses,
    outstandingTotal,
    outstandingCount,
    paidInvoices,
    cashFlow,
    revenueByService,
    expenseByCategory,
    aging,
    overdueCount,
    monthlySeries,
    yearlySeries,
    prevRevenue,
    prevExpenses,
    prevCostOfService,
  ] = await Promise.all([
    getRevenueTotal(yearRange),
    getExpenseTotal(yearRange),
    getCostOfServiceTotal(yearRange),
    getRevenueTotal(monthRange),
    getExpenseTotal(monthRange),
    getOutstandingInvoicesTotal(),
    db.invoice.count({ where: { status: { in: ["SENT", "PARTIAL", "OVERDUE"] } } }),
    getPaidInvoicesTotal(yearRange),
    getCashFlow(yearRange),
    getRevenueByService(yearRange),
    getExpenseByCategory(yearRange),
    getReceivableAging(now),
    db.invoice.count({ where: { status: "OVERDUE" } }),
    getMonthlySeries(12),
    getAnnualSeries(5),
    getRevenueTotal(lastYearRange),
    getExpenseTotal(lastYearRange),
    getCostOfServiceTotal(lastYearRange),
  ]);

  const grossProfit = totalRevenue - costOfService;
  const netProfit = totalRevenue - totalExpenses;
  const prevGross = prevRevenue - prevCostOfService;
  const prevNet = prevRevenue - prevExpenses;

  // Cards with a year-over-year delta.
  const headline = [
    { title: "Total Revenue (YTD)", value: totalRevenue, delta: pctChange(totalRevenue, prevRevenue), goodUp: true },
    { title: "Total Expenses (YTD)", value: totalExpenses, delta: pctChange(totalExpenses, prevExpenses), goodUp: false },
    { title: "Gross Profit", value: grossProfit, delta: pctChange(grossProfit, prevGross), goodUp: true },
    { title: "Net Profit", value: netProfit, delta: pctChange(netProfit, prevNet), goodUp: true },
  ];

  const secondary = [
    { title: "Outstanding Invoices", value: outstandingTotal, sub: `${outstandingCount} invoice${outstandingCount === 1 ? "" : "s"}` },
    { title: "Paid Invoices (YTD)", value: paidInvoices.total, sub: `${paidInvoices.count} invoice${paidInvoices.count === 1 ? "" : "s"}` },
    { title: "Monthly Revenue", value: monthlyRevenue },
    { title: "Monthly Expenses", value: monthlyExpenses },
    { title: "Cash Flow (YTD)", value: cashFlow.net },
    { title: "Accounts Receivable", value: outstandingTotal },
  ];

  const agingRows = [
    { label: "Current", value: aging.current, color: "#1D9E75" },
    { label: "1–30 days", value: aging.d1to30, color: "#EF9F27" },
    { label: "31–60 days", value: aging.d31to60, color: "#D85A30" },
    { label: "60+ days", value: aging.d60plus, color: "#E24B4A" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Finance</h1>
          <p className="text-sm text-muted-foreground">Year-to-date performance across all branches.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/finance/invoices" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <FileText className="size-4" />
            Invoices
          </Link>
          <Link href="/dashboard/finance/expenses" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <Receipt className="size-4" />
            Expenses
          </Link>
        </div>
      </div>

      {overdueCount > 0 && (
        <Link
          href="/dashboard/finance/invoices?status=OVERDUE"
          className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 transition-colors hover:bg-destructive/15"
        >
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <span className="text-sm text-destructive">
            <span className="font-semibold">
              {overdueCount} invoice{overdueCount === 1 ? "" : "s"} overdue
            </span>{" "}
            — <CurrencyAmount amountPhp={aging.d1to30 + aging.d31to60 + aging.d60plus} /> past due
          </span>
          <span className="ml-auto text-xs font-medium text-destructive">Review &amp; send reminders →</span>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {headline.map((kpi) => {
          const up = (kpi.delta ?? 0) >= 0;
          const positive = up === kpi.goodUp;
          return (
            <Card key={kpi.title}>
              <CardHeader>
                <CardDescription>{kpi.title}</CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  <CurrencyAmount amountPhp={kpi.value} />
                </CardTitle>
                {kpi.delta !== null ? (
                  <p className={cn("flex items-center gap-1 text-xs", positive ? "text-emerald-600" : "text-destructive")}>
                    {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                    {Math.abs(kpi.delta).toFixed(1)}% vs last year
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No prior-year data</p>
                )}
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {secondary.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader>
              <CardDescription>{kpi.title}</CardDescription>
              <CardTitle className="text-xl font-semibold">
                <CurrencyAmount amountPhp={kpi.value} />
              </CardTitle>
              {kpi.sub && <p className="text-xs text-muted-foreground">{kpi.sub}</p>}
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Accounts receivable aging */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Accounts receivable aging</h2>
          <span className="text-sm text-muted-foreground">
            Total <CurrencyAmount amountPhp={aging.total} />
          </span>
        </div>
        {aging.total > 0 ? (
          <>
            <div className="mb-3 flex h-3.5 overflow-hidden rounded">
              {agingRows.map(
                (row) =>
                  row.value > 0 && (
                    <div
                      key={row.label}
                      style={{ width: `${(row.value / aging.total) * 100}%`, backgroundColor: row.color }}
                    />
                  ),
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
              {agingRows.map((row) => (
                <span key={row.label} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: row.color }} />
                  {row.label}: <CurrencyAmount amountPhp={row.value} />
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No outstanding receivables.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="mb-2 font-heading text-base font-semibold">Monthly Revenue</h2>
          <MonthlyBarChart data={monthlySeries} dataKey="revenue" label="Revenue" color="#0a2540" />
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="mb-2 font-heading text-base font-semibold">Monthly Expenses</h2>
          <MonthlyBarChart data={monthlySeries} dataKey="expenses" label="Expenses" color="#c9a036" />
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:col-span-2">
          <h2 className="mb-2 font-heading text-base font-semibold">Revenue vs Expenses</h2>
          <RevenueVsExpensesChart data={monthlySeries} />
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="mb-2 font-heading text-base font-semibold">Income by Service</h2>
          <BreakdownPieChart data={revenueByService} />
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="mb-2 font-heading text-base font-semibold">Expense by Category</h2>
          <BreakdownPieChart data={expenseByCategory} />
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:col-span-2">
          <h2 className="mb-2 font-heading text-base font-semibold">Yearly Financial Trend</h2>
          <YearlyTrendChart data={yearlySeries} />
        </div>
      </div>
    </div>
  );
}
