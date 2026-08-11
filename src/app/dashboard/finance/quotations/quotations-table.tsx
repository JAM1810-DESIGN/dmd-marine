"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Trash2, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { notify } from "@/lib/notify";
import { setQuotationStatus, deleteQuotation } from "./actions";

export type QuotationRow = {
  id: string;
  quoteNumber: string;
  title: string;
  billTo: string;
  vesselName: string | null;
  currency: string;
  total: number;
  status: string;
  quoteDate: string;
};

const STATUSES = ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"] as const;
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SENT: "secondary",
  ACCEPTED: "default",
  DECLINED: "destructive",
  EXPIRED: "outline",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function QuotationsTable({ quotations }: { quotations: QuotationRow[] }) {
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = quotations.filter((q) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      q.quoteNumber.toLowerCase().includes(query) ||
      q.billTo.toLowerCase().includes(query) ||
      (q.vesselName ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="rounded-xl border-t-[3px] border-t-violet-500 bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">All Quotations</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} quotation{filtered.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search #, client, vessel..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-56" />
          <Link href="/dashboard/finance/quotations/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" />
            New Quotation
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState className="border-none" icon={FileText} title={search ? "No matches" : "No quotations yet"} description={search ? "Try a different search." : "Create one with New Quotation."} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Vessel</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((q) => (
              <TableRow key={q.id}>
                <TableCell>
                  <Link href={`/dashboard/finance/quotations/${q.id}`} className="font-medium text-foreground hover:underline">
                    {q.quoteNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{q.billTo}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{q.vesselName ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmtDate(q.quoteDate)}</TableCell>
                <TableCell className="text-sm font-medium tabular-nums">
                  {q.currency} {q.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <select
                    className="rounded border border-border bg-transparent px-1.5 py-1 text-xs"
                    value={q.status}
                    disabled={pending}
                    onChange={(e) =>
                      startTransition(async () => {
                        const result = await setQuotationStatus(q.id, e.target.value as (typeof STATUSES)[number]);
                        if (result.error) notify.error(result.error);
                        else notify.success("Status updated");
                      })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <Badge variant={STATUS_VARIANT[q.status] ?? "outline"} className="ml-2 hidden sm:inline-flex">
                    {q.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete quotation"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteQuotation(q.id);
                        if (result.error) notify.error(result.error);
                        else notify.success("Quotation deleted");
                      })
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
