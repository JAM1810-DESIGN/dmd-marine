"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { InvoiceFormDialog } from "./invoice-form-dialog";

const STATUS_OPTIONS = ["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"] as const;
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
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function InvoicesTable({
  invoices,
  customers,
  services,
  branches,
  canManage,
}: {
  invoices: InvoiceRow[];
  customers: { id: string; name: string }[];
  services: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);

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

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Invoices</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} invoice{filtered.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search #, customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-56" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
            <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              New Invoice
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No invoices match your filters.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <Link href={`/dashboard/finance/invoices/${invoice.id}`} className="font-medium text-foreground hover:underline">
                    {invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{invoice.customerName ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(invoice.issueDate)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(invoice.dueDate)}</TableCell>
                <TableCell className="text-sm font-medium">{formatCurrency(invoice.totalAmount)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[invoice.status] ?? "outline"}>{invoice.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
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
