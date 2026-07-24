"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PERIODS = ["monthly", "quarterly", "yearly", "custom"] as const;

export function PeriodSelector({
  period,
  start,
  end,
}: {
  period: string;
  start: string;
  end: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setPeriod(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`/dashboard/finance/statements?${params.toString()}`);
  }

  function setCustomDate(key: "start" | "end", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set(key, value);
    router.push(`/dashboard/finance/statements?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p} value={p} className="capitalize">
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {period === "custom" && (
        <>
          <div className="grid gap-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={start} onChange={(e) => setCustomDate("start", e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={end} onChange={(e) => setCustomDate("end", e.target.value)} />
          </div>
        </>
      )}
    </div>
  );
}
