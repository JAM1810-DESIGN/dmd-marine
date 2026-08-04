"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
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
import { CurrencyAmount } from "@/components/shared/currency-amount";

const STATUS_OPTIONS = ["PENDING", "COMPLETED", "REFUNDED", "FAILED"] as const;

export type PaymentRow = {
  id: string;
  paymentDate: string;
  customerName: string | null;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  method: string;
  status: string;
  referenceNumber: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function PaymentsTable({ payments }: { payments: PaymentRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments.filter((payment) => {
      if (statusFilter !== "ALL" && payment.status !== statusFilter) return false;
      if (!query) return true;
      return (
        payment.invoiceNumber.toLowerCase().includes(query) ||
        (payment.customerName ?? "").toLowerCase().includes(query) ||
        (payment.referenceNumber ?? "").toLowerCase().includes(query)
      );
    });
  }, [payments, search, statusFilter]);

  const total = filtered.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0);

  function exportCsv() {
    const header = ["Date", "Customer", "Invoice #", "Amount", "Method", "Status", "Reference"];
    const rows = filtered.map((p) => [
      formatDate(p.paymentDate),
      p.customerName ?? "",
      p.invoiceNumber,
      p.amount.toFixed(2),
      p.method,
      p.status,
      p.referenceNumber ?? "",
    ]);
    downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(header, rows));
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Payments</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} payment{filtered.length === 1 ? "" : "s"} · <CurrencyAmount amountPhp={total} /> completed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search invoice, customer, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-64"
          />
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
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No payments match your filters.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="text-sm text-muted-foreground">{formatDate(payment.paymentDate)}</TableCell>
                <TableCell className="text-sm">{payment.customerName ?? "—"}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/finance/invoices/${payment.invoiceId}`} className="text-sm font-medium text-foreground hover:underline">
                    {payment.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{payment.method.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-sm font-medium"><CurrencyAmount amountPhp={payment.amount} /></TableCell>
                <TableCell>
                  <Badge variant={payment.status === "REFUNDED" ? "destructive" : "default"}>{payment.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
