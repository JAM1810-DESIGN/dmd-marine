"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, Download, Plus, Trash2, X, Pencil } from "lucide-react";
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
import { notify } from "@/lib/notify";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { CurrencyAmount } from "@/components/shared/currency-amount";
import {
  approveExpense,
  rejectExpense,
  markExpensePaid,
  duplicateExpense,
  deleteExpense,
} from "./actions";
import { ExpenseFormDialog } from "./expense-form-dialog";
import { ReceiptCell } from "./receipt-cell";

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  PAID: "outline",
};

export type ExpenseRow = {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  categoryId: string;
  categoryName: string;
  vendorId: string | null;
  vendorName: string | null;
  description: string;
  projectId: string | null;
  bookingId: string | null;
  branchId: string | null;
  branchName: string | null;
  amount: number;
  taxAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  notes: string | null;
  createdById: string;
  createdByName: string;
  receipts: { id: string; fileName: string; url: string }[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function RowActions({
  expense,
  canApprove,
  canManage,
}: {
  expense: ExpenseRow;
  canApprove: boolean;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      {canApprove && expense.paymentStatus === "PENDING" && (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Approve"
            disabled={isPending}
            onClick={() => startTransition(async () => { await approveExpense(expense.id); notify.success("Expense approved"); })}
          >
            <Check className="size-4 text-emerald-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reject"
            disabled={isPending}
            onClick={() => startTransition(async () => { await rejectExpense(expense.id); notify.success("Expense rejected"); })}
          >
            <X className="size-4 text-destructive" />
          </Button>
        </>
      )}
      {canManage && expense.paymentStatus === "APPROVED" && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(async () => { await markExpensePaid(expense.id); notify.success("Marked as paid"); })}
        >
          Mark Paid
        </Button>
      )}
      {canManage && (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Duplicate"
            disabled={isPending}
            onClick={() => startTransition(async () => { await duplicateExpense(expense.id); notify.success("Expense duplicated"); })}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            disabled={isPending}
            onClick={() => startTransition(async () => { await deleteExpense(expense.id); notify.success("Expense deleted"); })}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </>
      )}
    </div>
  );
}

export function ExpensesTable({
  expenses,
  categories,
  vendors,
  projects,
  bookings,
  branches,
  canCreate,
  canApprove,
  canManage,
  storageConfigured,
}: {
  expenses: ExpenseRow[];
  categories: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  bookings: { id: string; customerName: string }[];
  branches: { id: string; name: string }[];
  canCreate: boolean;
  canApprove: boolean;
  canManage: boolean;
  storageConfigured: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [dialog, setDialog] = useState<{ open: boolean; expense?: ExpenseRow }>({ open: false });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (statusFilter !== "ALL" && expense.paymentStatus !== statusFilter) return false;
      if (categoryFilter !== "ALL" && expense.categoryId !== categoryFilter) return false;
      if (branchFilter !== "ALL" && expense.branchId !== branchFilter) return false;
      if (!query) return true;
      return (
        expense.expenseNumber.toLowerCase().includes(query) ||
        (expense.vendorName ?? "").toLowerCase().includes(query) ||
        expense.description.toLowerCase().includes(query) ||
        expense.categoryName.toLowerCase().includes(query)
      );
    });
  }, [expenses, search, statusFilter, categoryFilter, branchFilter]);

  const total = filtered.reduce((sum, e) => sum + e.amount + e.taxAmount, 0);

  function exportCsv() {
    const header = ["Expense #", "Date", "Category", "Vendor", "Description", "Amount", "Tax", "Branch", "Status"];
    const rows = filtered.map((e) => [
      e.expenseNumber,
      formatDate(e.expenseDate),
      e.categoryName,
      e.vendorName ?? "",
      e.description,
      e.amount.toFixed(2),
      e.taxAmount.toFixed(2),
      e.branchName ?? "",
      e.paymentStatus,
    ]);
    downloadCsv(`expenses-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(header, rows));
  }

  return (
    <div className="rounded-xl border-t-[3px] border-t-amber-500 bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} record{filtered.length === 1 ? "" : "s"} · <CurrencyAmount amountPhp={total} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search #, vendor, description..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:w-56"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
            <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "ALL")}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v ?? "ALL")}>
            <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All branches</SelectItem>
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setDialog({ open: true, expense: undefined })}>
              <Plus className="size-4" />
              New Expense
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No expenses match your filters.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expense #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium text-foreground">{expense.expenseNumber}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(expense.expenseDate)}</TableCell>
                <TableCell className="text-sm">{expense.categoryName}</TableCell>
                <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                  {expense.description}
                  {expense.vendorName && <span className="block text-xs">{expense.vendorName}</span>}
                </TableCell>
                <TableCell className="text-sm font-medium"><CurrencyAmount amountPhp={expense.amount + expense.taxAmount} /></TableCell>
                <TableCell>
                  <ReceiptCell expenseId={expense.id} receipts={expense.receipts} storageConfigured={storageConfigured} />
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[expense.paymentStatus] ?? "outline"}>{expense.paymentStatus}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit"
                        onClick={() => setDialog({ open: true, expense })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    <RowActions expense={expense} canApprove={canApprove} canManage={canManage} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ExpenseFormDialog
        key={dialog.expense?.id ?? "new"}
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        expense={dialog.expense}
        categories={categories}
        vendors={vendors}
        projects={projects}
        bookings={bookings}
        branches={branches}
      />
    </div>
  );
}
