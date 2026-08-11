"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Download, Plus, Mail, Send, Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { CurrencyAmount } from "@/components/shared/currency-amount";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { sendInvoiceReminder, remindAllOverdue } from "./actions";

const STATUS_TABS = ["ALL", "DRAFT", "SENT", "PARTIAL", "OVERDUE", "PAID", "CANCELLED"] as const;
const REMINDABLE = new Set(["SENT", "PARTIAL", "OVERDUE"]);
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SENT: "secondary",
  PARTIAL: "secondary",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "outline",
};

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  issueDate: string;
  dueDate: string | null;
  totalAmount: number;
  status: string;
  lastReminderAt: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function daysOverdue(dueIso: string | null) {
  if (!dueIso) return 0;
  const diff = Math.floor((Date.now() - new Date(dueIso).getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function InvoicesTable({
  invoices,
  customers,
  services,
  branches,
  canManage,
  initialStatus = "ALL",
}: {
  invoices: InvoiceRow[];
  customers: { id: string; name: string }[];
  services: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  canManage: boolean;
  initialStatus?: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    (STATUS_TABS as readonly string[]).includes(initialStatus) ? initialStatus : "ALL",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: invoices.length };
    for (const invoice of invoices) map[invoice.status] = (map[invoice.status] ?? 0) + 1;
    return map;
  }, [invoices]);

  const overdueCount = counts.OVERDUE ?? 0;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (statusFilter !== "ALL" && invoice.status !== statusFilter) return false;
      if (!query) return true;
      return (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        (invoice.customerName ?? "").toLowerCase().includes(query)
      );
    });
  }, [invoices, search, statusFilter]);

  function exportCsv() {
    const header = ["Invoice #", "Customer", "Issue Date", "Due Date", "Total", "Status"];
    const rows = filtered.map((i) => [
      i.invoiceNumber,
      i.customerName ?? "",
      formatDate(i.issueDate),
      formatDate(i.dueDate),
      i.totalAmount.toFixed(2),
      i.status,
    ]);
    downloadCsv(`invoices-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(header, rows));
  }

  function remind(id: string) {
    startTransition(async () => {
      const result = await sendInvoiceReminder(id);
      if (result.error) notify.error(result.error);
      else if (result.warning) notify.info(result.warning);
      else notify.success("Reminder emailed");
    });
  }

  function remindAll() {
    startTransition(async () => {
      const result = await remindAllOverdue();
      if (result.error) notify.error(result.error);
      else if (result.sent === 0) notify.info(`No reminders sent (${result.skipped} skipped — check customer emails).`);
      else notify.success(`Sent ${result.sent} reminder${result.sent === 1 ? "" : "s"}${result.skipped ? `, ${result.skipped} skipped` : ""}`);
    });
  }

  return (
    <div className="rounded-xl border-t-[3px] border-t-blue-500 bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Invoices</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} invoice{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search #, customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-56" />
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export
          </Button>
          {canManage && overdueCount > 0 && (
            <Button variant="outline" onClick={remindAll} disabled={pending}>
              <Send className="size-4" />
              Remind overdue ({overdueCount})
            </Button>
          )}
          {canManage && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              New Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 pb-3">
        {STATUS_TABS.map((tab) => {
          const count = counts[tab] ?? 0;
          const active = statusFilter === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                active
                  ? tab === "OVERDUE"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-accent/15 text-accent"
                  : "text-muted-foreground hover:bg-secondary/60",
              )}
            >
              {tab === "ALL" ? "All" : tab.toLowerCase()} {count > 0 && <span className="opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No invoices match your filters.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due / Aging</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((invoice) => {
              const overdueDays = invoice.status === "OVERDUE" ? daysOverdue(invoice.dueDate) : 0;
              return (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link href={`/dashboard/finance/invoices/${invoice.id}`} className="font-medium text-foreground hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.customerName ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(invoice.issueDate)}</TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted-foreground">{formatDate(invoice.dueDate)}</span>
                    {overdueDays > 0 && (
                      <span className="ml-1.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                        {overdueDays}d
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium"><CurrencyAmount amountPhp={invoice.totalAmount} /></TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[invoice.status] ?? "outline"}>{invoice.status}</Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {REMINDABLE.has(invoice.status) ? (
                        <Button variant="ghost" size="sm" disabled={pending} onClick={() => remind(invoice.id)}>
                          <Mail className="size-4" />
                          {invoice.lastReminderAt ? "Remind again" : "Remind"}
                        </Button>
                      ) : invoice.status === "PAID" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <Check className="size-3.5" />
                          Paid
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customers={customers}
        services={services}
        branches={branches}
      />
    </div>
  );
}
