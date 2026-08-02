import type { Metadata } from "next";
import type { ReactNode } from "react";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import {
  getMonthlyInquiries,
  getBookingsByStatus,
  getCompletedServices,
  getLeadSources,
  getCustomerGrowth,
  getPopularServices,
  type DateRange,
} from "@/lib/report-calculations";
import { ReportSelector } from "./report-selector";
import { ReportTable } from "@/components/shared/report-table";
import {
  CountBarChart,
  CountPieChart,
  InquiriesSeriesChart,
  CustomerGrowthChart,
} from "./report-charts";

export const metadata: Metadata = { title: "Reports" };

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
  const params = await searchParams;
  const report = params.report ?? "monthly-inquiries";
  const period = params.period ?? "monthly";
  const range = rangeFor(period);

  let title = "";
  let columns: string[] = [];
  let rows: (string | number)[][] = [];
  let chart: ReactNode = null;

  switch (report) {
    case "monthly-inquiries": {
      title = "Monthly Inquiries (last 12 months)";
      columns = ["Month", "Bookings", "Contact Form", "Total"];
      const data = await getMonthlyInquiries(12);
      rows = data.map((d) => [d.label, d.bookings, d.contactSubmissions, d.total]);
      chart = <InquiriesSeriesChart data={data} />;
      break;
    }
    case "bookings-by-status": {
      title = "Bookings by Status";
      columns = ["Status", "Count"];
      const data = await getBookingsByStatus(range);
      rows = data.map((d) => [d.name, d.count]);
      chart = <CountBarChart data={data} />;
      break;
    }
    case "completed-services": {
      title = "Completed Services";
      columns = ["Service", "Completed Count"];
      const data = await getCompletedServices(range);
      rows = data.map((d) => [d.name, d.count]);
      chart = <CountBarChart data={data} color="var(--success)" />;
      break;
    }
    case "lead-sources": {
      title = "Lead Sources";
      columns = ["Source", "Count"];
      const data = await getLeadSources(range);
      rows = data.map((d) => [d.name, d.count]);
      chart = <CountPieChart data={data} />;
      break;
    }
    case "customer-growth": {
      title = "Customer Growth (last 12 months)";
      columns = ["Month", "New Customers", "Total Customers"];
      const data = await getCustomerGrowth(12);
      rows = data.map((d) => [d.label, d.newCustomers, d.totalCustomers]);
      chart = <CustomerGrowthChart data={data} />;
      break;
    }
    case "popular-services": {
      title = "Popular Services (by booking volume)";
      columns = ["Service", "Bookings"];
      const data = await getPopularServices(range);
      rows = data.map((d) => [d.name, d.count]);
      chart = <CountBarChart data={data} color="var(--chart-2)" />;
      break;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Cross-module business insights: inquiries, bookings, leads, and growth.</p>
        </div>
        <ReportSelector report={report} period={period} />
      </div>

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">{chart}</div>

      <ReportTable
        title={title}
        columns={columns}
        rows={rows}
        filename={`${report}-${new Date().toISOString().slice(0, 10)}.csv`}
      />
    </div>
  );
}
