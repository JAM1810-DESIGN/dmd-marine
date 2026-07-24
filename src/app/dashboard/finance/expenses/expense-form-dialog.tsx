"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { createExpense, updateExpense } from "./actions";

const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "GCASH",
  "MAYA",
  "CHECK",
  "OTHER",
] as const;

type ExpenseRecord = {
  id: string;
  expenseDate: string;
  categoryId: string;
  vendorId: string | null;
  description: string;
  projectId: string | null;
  bookingId: string | null;
  branchId: string | null;
  amount: number;
  taxAmount: number;
  paymentMethod: string;
  notes: string | null;
};

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  categories,
  vendors,
  projects,
  bookings,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseRecord;
  categories: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  bookings: { id: string; customerName: string }[];
  branches: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = expense
        ? await updateExpense(expense.id, {}, formData)
        : await createExpense({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      notify.success(expense ? "Expense updated" : "Expense submitted");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "New Expense"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="expenseDate">Date</Label>
              <Input
                id="expenseDate"
                name="expenseDate"
                type="date"
                defaultValue={expense?.expenseDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <Select name="categoryId" defaultValue={expense?.categoryId} required>
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={expense?.description} rows={2} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={expense?.amount}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="taxAmount">Tax Amount</Label>
              <Input
                id="taxAmount"
                name="taxAmount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={expense?.taxAmount ?? 0}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select name="paymentMethod" defaultValue={expense?.paymentMethod ?? "CASH"} required>
                <SelectTrigger id="paymentMethod" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vendorId">Vendor</Label>
              <Select name="vendorId" defaultValue={expense?.vendorId ?? "none"}>
                <SelectTrigger id="vendorId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="branchId">Branch</Label>
              <Select name="branchId" defaultValue={expense?.branchId ?? "none"}>
                <SelectTrigger id="branchId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="projectId">Project</Label>
              <Select name="projectId" defaultValue={expense?.projectId ?? "none"}>
                <SelectTrigger id="projectId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bookingId">Booking</Label>
              <Select name="bookingId" defaultValue={expense?.bookingId ?? "none"}>
                <SelectTrigger id="bookingId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {bookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={expense?.notes ?? ""} rows={2} />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="self-end">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
