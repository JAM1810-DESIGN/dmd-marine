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
  { value: "monthly-inquiries", label: "Monthly Inquiries", isSeries: true },
  { value: "bookings-by-status", label: "Bookings", isSeries: false },
  { value: "completed-services", label: "Completed Services", isSeries: false },
  { value: "lead-sources", label: "Lead Sources", isSeries: false },
  { value: "customer-growth", label: "Customer Growth", isSeries: true },
  { value: "popular-services", label: "Popular Services", isSeries: false },
] as const;

const PERIODS = ["monthly", "quarterly", "yearly"] as const;

export function ReportSelector({ report, period }: { report: string; period: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSeries = REPORTS.find((r) => r.value === report)?.isSeries ?? false;

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/dashboard/reports?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={report} onValueChange={(v) => v && update("report", v)}>
        <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
        <SelectContent>
          {REPORTS.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isSeries && (
        <Select value={period} onValueChange={(v) => v && update("period", v)}>
          <SelectTrigger className="w-36 capitalize"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
