import type { Metadata } from "next";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import {
  getRevenueByService,
  getRevenueByCustomer,
  getRevenueByBranch,
  getExpenseByCategory,
  getExpenseByVendor,
  getProjectProfitability,
  getBookingProfitability,
  getConsultantPerformance,
  getMonthlySeries,
  getAnnualSeries,
  type DateRange,
} from "@/lib/finance-calculations";
import { ReportSelector } from "./report-selector";
import { ReportTable } from "@/components/shared/report-table";

export const metadata: Metadata = { title: "Finance Reports" };

function currency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function dateStr(date: Date | null) {
  return date ? date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

function rangeFor(period: string): DateRange {
  const now = new Date();
  if (period === "quarterly") return { start: startOfQuarter(now), end: endOfQuarter(now) };
  if (period === "yearly") return { start: startOfYear(now), end: endOfYear(now) };
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; period?: string }>;
}) {
  const session = await auth();
  if (session?.user.role === "STAFF") {
    return <AccessDenied message="Finance reports are restricted to Admin, Manager, and Finance Officer roles." />;
  }

  const params = await searchParams;
  const report = params.report ?? "revenue-by-service";
  const period = params.period ?? "monthly";
  const range = rangeFor(period);

  let title = "";
  let columns: string[] = [];
  let rows: (string | number)[][] = [];

  switch (report) {
    case "revenue-by-service": {
      title = "Revenue by Service";
      columns = ["Service", "Revenue"];
      const data = await getRevenueByService(range);
      rows = data.map((d) => [d.name, currency(d.amount)]);
      break;
    }
    case "revenue-by-customer": {
      title = "Revenue by Customer";
      columns = ["Customer", "Revenue"];
      const data = await getRevenueByCustomer(range);
      rows = data.map((d) => [d.name, currency(d.amount)]);
      break;
    }
    case "revenue-by-branch": {
      title = "Revenue by Branch";
      columns = ["Branch", "Revenue"];
      const data = await getRevenueByBranch(range);
      rows = data.map((d) => [d.name, currency(d.amount)]);
      break;
    }
    case "expenses-by-category": {
      title = "Expenses by Category";
      columns = ["Category", "Amount"];
      const data = await getExpenseByCategory(range);
      rows = data.map((d) => [d.name, currency(d.amount)]);
      break;
    }
    case "expenses-by-vendor": {
      title = "Expenses by Vendor";
      columns = ["Vendor", "Amount"];
      const data = await getExpenseByVendor(range);
      rows = data.map((d) => [d.name, currency(d.amount)]);
      break;
    }
    case "project-profitability": {
      title = "Project Profitability";
      columns = ["Project", "Revenue", "Expenses", "Profit"];
      const data = await getProjectProfitability(range);
      rows = data.map((d) => [d.name, currency(d.revenue), currency(d.expense), currency(d.profit)]);
      break;
    }
    case "booking-profitability": {
      title = "Booking Profitability";
      columns = ["Customer", "Revenue", "Expenses", "Profit"];
      const data = await getBookingProfitability(range);
      rows = data.map((d) => [d.name, currency(d.revenue), currency(d.expense), currency(d.profit)]);
      break;
    }
    case "consultant-performance": {
      title = "Consultant Performance";
      columns = ["Consultant", "Projects", "Completed", "Revenue"];
      const data = await getConsultantPerformance(range);
      rows = data.map((d) => [d.name, d.projectCount, d.completedCount, currency(d.revenue)]);
      break;
    }
    case "outstanding-invoices": {
      title = "Outstanding Invoices";
      columns = ["Invoice #", "Customer", "Due Date", "Total", "Status"];
      const invoices = await db.invoice.findMany({
        where: { status: { in: ["SENT", "PARTIAL", "OVERDUE"] } },
        include: { customer: true },
        orderBy: { dueDate: "asc" },
      });
      rows = invoices.map((i) => [i.invoiceNumber, i.customer?.name ?? "—", dateStr(i.dueDate), currency(Number(i.totalAmount)), i.status]);
      break;
    }
    case "paid-invoices": {
      title = "Paid Invoices";
      columns = ["Invoice #", "Customer", "Issue Date", "Total"];
      const invoices = await db.invoice.findMany({
        where: { status: "PAID", issueDate: { gte: range.start, lte: range.end } },
        include: { customer: true },
        orderBy: { issueDate: "desc" },
      });
      rows = invoices.map((i) => [i.invoiceNumber, i.customer?.name ?? "—", dateStr(i.issueDate), currency(Number(i.totalAmount))]);
      break;
    }
    case "monthly-summary": {
      title = "Monthly Financial Summary (last 12 months)";
      columns = ["Month", "Revenue", "Expenses", "Net"];
      const data = await getMonthlySeries(12);
      rows = data.map((d) => [d.label, currency(d.revenue), currency(d.expenses), currency(d.revenue - d.expenses)]);
      break;
    }
    case "annual-summary": {
      title = "Annual Financial Summary (last 5 years)";
      columns = ["Year", "Revenue", "Expenses", "Net"];
      const data = await getAnnualSeries(5);
      rows = data.map((d) => [d.label, currency(d.revenue), currency(d.expenses), currency(d.revenue - d.expenses)]);
      break;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Financial performance across services, customers, and teams.</p>
        </div>
        <ReportSelector report={report} period={period} />
      </div>

      <ReportTable
        title={title}
        columns={columns}
        rows={rows}
        filename={`${report}-${new Date().toISOString().slice(0, 10)}.csv`}
      />
    </div>
  );
}
