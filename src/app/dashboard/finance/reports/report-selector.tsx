"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const REPORTS = [
  { value: "revenue-by-service", label: "Revenue by Service" },
  { value: "revenue-by-customer", label: "Revenue by Customer" },
  { value: "revenue-by-branch", label: "Revenue by Branch" },
  { value: "expenses-by-category", label: "Expenses by Category" },
  { value: "expenses-by-vendor", label: "Expenses by Vendor" },
  { value: "project-profitability", label: "Project Profitability" },
  { value: "booking-profitability", label: "Booking Profitability" },
  { value: "consultant-performance", label: "Consultant Performance" },
  { value: "outstanding-invoices", label: "Outstanding Invoices" },
  { value: "paid-invoices", label: "Paid Invoices" },
  { value: "monthly-summary", label: "Monthly Financial Summary" },
  { value: "annual-summary", label: "Annual Financial Summary" },
] as const;

const PERIODS = ["monthly", "quarterly", "yearly"] as const;

export function ReportSelector({ report, period }: { report: string; period: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/dashboard/finance/reports?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={report} onValueChange={(v) => v && update("report", v)}>
        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          {REPORTS.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={(v) => v && update("period", v)}>
        <SelectTrigger className="w-36 capitalize"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
