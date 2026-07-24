import type { Metadata } from "next";
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  getRevenueTotal,
  getExpenseTotal,
  getCostOfServiceTotal,
  getOutstandingInvoicesTotal,
  getPaidInvoicesTotal,
  getCashFlow,
  getRevenueByService,
  getExpenseByCategory,
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

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
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
    monthlySeries,
    yearlySeries,
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
    getMonthlySeries(12),
    getAnnualSeries(5),
  ]);

  const grossProfit = totalRevenue - costOfService;
  const netProfit = totalRevenue - totalExpenses;

  const kpis = [
    { title: "Total Revenue (YTD)", value: totalRevenue },
    { title: "Total Expenses (YTD)", value: totalExpenses },
    { title: "Gross Profit", value: grossProfit },
    { title: "Net Profit", value: netProfit },
    { title: "Outstanding Invoices", value: outstandingTotal, sub: `${outstandingCount} invoice${outstandingCount === 1 ? "" : "s"}` },
    { title: "Paid Invoices (YTD)", value: paidInvoices.total, sub: `${paidInvoices.count} invoice${paidInvoices.count === 1 ? "" : "s"}` },
    { title: "Monthly Revenue", value: monthlyRevenue },
    { title: "Monthly Expenses", value: monthlyExpenses },
    { title: "Cash Flow (YTD)", value: cashFlow.net },
    { title: "Accounts Receivable", value: outstandingTotal },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground">Year-to-date performance across all branches.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader>
              <CardDescription>{kpi.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold">{formatCurrency(kpi.value)}</CardTitle>
              {kpi.sub && <p className="text-xs text-muted-foreground">{kpi.sub}</p>}
            </CardHeader>
          </Card>
        ))}
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
