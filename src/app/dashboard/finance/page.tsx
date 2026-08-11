import type { Metadata } from "next";
import Link from "next/link";
import { startOfYear, endOfYear, subYears } from "date-fns";
import {
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Receipt,
  TrendingUp,
  PieChart,
  Clock,
  Wallet,
  FileSignature,
  History,
  Banknote,
  BarChart3,
} from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { CurrencyAmount } from "@/components/shared/currency-amount";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionShell } from "@/components/shared/section-shell";
import { cn } from "@/lib/utils";
import {
  getRevenueTotal,
  getExpenseTotal,
  getOutstandingInvoicesTotal,
  getCashFlow,
  getCashPosition,
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

const KPI_TONE: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  gray: "bg-neutral-100 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-300",
  purple: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
};

export default async function FinanceDashboardPage() {
  const session = await auth();
  if (session?.user.role === "STAFF") {
    return <AccessDenied message="Finance overview is restricted to Admin, Manager, and Finance Officer roles." />;
  }

  await refreshOverdueInvoices();

  const now = new Date();
  const yearRange = { start: startOfYear(now), end: endOfYear(now) };
  const lastYearRange = { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) };

  const [
    totalRevenue,
    totalExpenses,
    outstandingTotal,
    cashFlow,
    cashPosition,
    revenueByService,
    expenseByCategory,
    aging,
    overdueCount,
    monthlySeries,
    yearlySeries,
    prevRevenue,
    prevExpenses,
    quotationRows,
    recentPayments,
    recentInvoices,
    recentExpenses,
    recentQuotations,
  ] = await Promise.all([
    getRevenueTotal(yearRange),
    getExpenseTotal(yearRange),
    getOutstandingInvoicesTotal(),
    getCashFlow(yearRange),
    getCashPosition(now),
    getRevenueByService(yearRange),
    getExpenseByCategory(yearRange),
    getReceivableAging(now),
    db.invoice.count({ where: { status: "OVERDUE" } }),
    getMonthlySeries(12),
    getAnnualSeries(5),
    getRevenueTotal(lastYearRange),
    getExpenseTotal(lastYearRange),
    db.quotation.findMany({ select: { status: true, taxRatePercent: true, items: { select: { quantity: true, unitPrice: true } } } }),
    db.payment.findMany({ take: 5, orderBy: { paymentDate: "desc" }, include: { invoice: { include: { customer: true } } } }),
    db.invoice.findMany({ take: 5, orderBy: { issueDate: "desc" }, include: { customer: true } }),
    db.expense.findMany({ take: 5, orderBy: { expenseDate: "desc" }, select: { id: true, description: true, amount: true, taxAmount: true, expenseDate: true } }),
    db.quotation.findMany({ take: 5, orderBy: { updatedAt: "desc" }, select: { id: true, quoteNumber: true, status: true, updatedAt: true } }),
  ]);

  const netProfit = totalRevenue - totalExpenses;
  const prevNet = prevRevenue - prevExpenses;

  const kpis = [
    { title: "Revenue (YTD)", value: totalRevenue, delta: pctChange(totalRevenue, prevRevenue), goodUp: true, icon: TrendingUp, tone: "green" },
    { title: "Expenses (YTD)", value: totalExpenses, delta: pctChange(totalExpenses, prevExpenses), goodUp: false, icon: Receipt, tone: "gray" },
    { title: "Net profit", value: netProfit, delta: pctChange(netProfit, prevNet), goodUp: true, icon: PieChart, tone: "purple" },
    { title: "Receivable", value: outstandingTotal, delta: null, goodUp: true, icon: Clock, tone: "blue" },
  ];

  const agingRows = [
    { label: "Current", value: aging.current, color: "#1D9E75" },
    { label: "1–30 days", value: aging.d1to30, color: "#EF9F27" },
    { label: "31–60 days", value: aging.d31to60, color: "#D85A30" },
    { label: "60+ days", value: aging.d60plus, color: "#E24B4A" },
  ];

  // Quotation pipeline.
  const pipeline: Record<string, number> = { DRAFT: 0, SENT: 0, ACCEPTED: 0, DECLINED: 0, EXPIRED: 0 };
  let openQuoteValue = 0;
  for (const q of quotationRows) {
    pipeline[q.status] = (pipeline[q.status] ?? 0) + 1;
    if (q.status === "DRAFT" || q.status === "SENT") {
      const sub = q.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
      openQuoteValue += sub + (sub * Number(q.taxRatePercent)) / 100;
    }
  }
  const pipeRows = [
    { label: "Draft", count: pipeline.DRAFT, color: "#888780" },
    { label: "Sent", count: pipeline.SENT, color: "#378ADD" },
    { label: "Accepted", count: pipeline.ACCEPTED, color: "#1D9E75" },
  ];
  const pipeMax = Math.max(1, ...pipeRows.map((r) => r.count));

  // Recent activity feed (merged, newest first).
  type Activity = { id: string; kind: string; label: string; amount: number | null; positive: boolean; date: Date; icon: typeof Banknote; tone: string };
  const activity: Activity[] = [
    ...recentPayments.map((p) => ({ id: `pay-${p.id}`, kind: "Payment", label: p.invoice.customer?.name ?? p.invoice.invoiceNumber, amount: Number(p.amount), positive: true, date: p.paymentDate, icon: Banknote, tone: "text-emerald-600" })),
    ...recentInvoices.map((i) => ({ id: `inv-${i.id}`, kind: `Invoice ${i.invoiceNumber}`, label: i.customer?.name ?? "—", amount: Number(i.totalAmount), positive: false, date: i.issueDate, icon: FileText, tone: "text-blue-600" })),
    ...recentExpenses.map((e) => ({ id: `exp-${e.id}`, kind: "Expense", label: e.description, amount: -(Number(e.amount) + Number(e.taxAmount)), positive: false, date: e.expenseDate, icon: Receipt, tone: "text-neutral-500" })),
    ...recentQuotations.map((q) => ({ id: `qt-${q.id}`, kind: `Quotation ${q.quoteNumber}`, label: q.status, amount: null, positive: false, date: q.updatedAt, icon: FileSignature, tone: "text-violet-600" })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 7);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Finance</h1>
          <p className="text-sm text-muted-foreground">Year-to-date performance across all branches.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/finance/quotations" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <FileSignature className="size-4" />
            Quotations
          </Link>
          <Link href="/dashboard/finance/invoices" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <FileText className="size-4" />
            Invoices
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
          <span className="ml-auto text-xs font-medium text-destructive">Review &amp; remind →</span>
        </Link>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const up = (kpi.delta ?? 0) >= 0;
          const positive = up === kpi.goodUp;
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className="relative rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <span className={cn("absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg", KPI_TONE[kpi.tone])}>
                <Icon className="size-4" />
              </span>
              <p className="text-xs text-muted-foreground">{kpi.title}</p>
              <p className="mt-1 text-2xl font-semibold">
                <CurrencyAmount amountPhp={kpi.value} />
              </p>
              {kpi.delta !== null ? (
                <p className={cn("mt-0.5 flex items-center gap-1 text-xs", positive ? "text-emerald-600" : "text-destructive")}>
                  {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {Math.abs(kpi.delta).toFixed(1)}% vs last year
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">Outstanding balance</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Cash · Aging · Quotations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionShell tone="teal" icon={Wallet} title="Cash position" description="Cash-basis, as of today">
          <div className="p-4">
            <p className="text-2xl font-semibold text-emerald-600">
              <CurrencyAmount amountPhp={cashPosition} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              In <CurrencyAmount amountPhp={cashFlow.cashIn} /> · Out <CurrencyAmount amountPhp={cashFlow.cashOut} /> (YTD)
            </p>
          </div>
        </SectionShell>

        <SectionShell tone="gold" icon={Clock} title="Receivable aging" count={aging.total > 0 ? undefined : "—"}>
          <div className="p-4">
            {aging.total > 0 ? (
              <>
                <div className="mb-3 flex h-3 overflow-hidden rounded">
                  {agingRows.map(
                    (row) =>
                      row.value > 0 && (
                        <div key={row.label} style={{ width: `${(row.value / aging.total) * 100}%`, backgroundColor: row.color }} />
                      ),
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
        </SectionShell>

        <SectionShell tone="purple" icon={FileSignature} title="Quotations pipeline">
          <div className="flex flex-col gap-2.5 p-4">
            {pipeRows.map((row) => (
              <div key={row.label} className="flex items-center gap-2 text-sm">
                <span className="w-16 shrink-0 text-muted-foreground">{row.label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <span className="block h-full rounded-full" style={{ width: `${(row.count / pipeMax) * 100}%`, backgroundColor: row.color }} />
                </span>
                <span className="w-8 shrink-0 text-right font-medium">{row.count}</span>
              </div>
            ))}
            <p className="mt-1 text-xs text-muted-foreground">
              Open value <CurrencyAmount amountPhp={openQuoteValue} />
            </p>
          </div>
        </SectionShell>
      </div>

      {/* Revenue vs expenses · Recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionShell tone="blue" icon={BarChart3} title="Revenue vs expenses" description="Last 12 months">
          <div className="p-4">
            <RevenueVsExpensesChart data={monthlySeries} />
          </div>
        </SectionShell>

        <SectionShell tone="gray" icon={History} title="Recent activity">
          <div className="flex flex-col divide-y divide-border px-4">
            {activity.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              activity.map((a) => {
                const Icon = a.icon;
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
                      <Icon className={cn("size-4", a.tone)} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{a.kind}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.label}</p>
                    </div>
                    {a.amount !== null ? (
                      <span className={cn("shrink-0 text-sm font-medium tabular-nums", a.positive ? "text-emerald-600" : "text-foreground")}>
                        {a.positive ? "+" : ""}
                        <CurrencyAmount amountPhp={Math.abs(a.amount)} />
                      </span>
                    ) : (
                      <Badge variant="outline" className="shrink-0">{a.label}</Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </SectionShell>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionShell tone="teal" icon={TrendingUp} title="Monthly revenue">
          <div className="p-4"><MonthlyBarChart data={monthlySeries} dataKey="revenue" label="Revenue" color="#1D9E75" /></div>
        </SectionShell>
        <SectionShell tone="gold" icon={Receipt} title="Monthly expenses">
          <div className="p-4"><MonthlyBarChart data={monthlySeries} dataKey="expenses" label="Expenses" color="#EF9F27" /></div>
        </SectionShell>
        <SectionShell tone="teal" icon={PieChart} title="Income by service">
          <div className="p-4"><BreakdownPieChart data={revenueByService} /></div>
        </SectionShell>
        <SectionShell tone="purple" icon={PieChart} title="Expense by category">
          <div className="p-4"><BreakdownPieChart data={expenseByCategory} /></div>
        </SectionShell>
        <div className="lg:col-span-2">
          <SectionShell tone="blue" icon={BarChart3} title="Yearly financial trend">
            <div className="p-4"><YearlyTrendChart data={yearlySeries} /></div>
          </SectionShell>
        </div>
      </div>
    </div>
  );
}
