"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { createBudget, updateBudget } from "./actions";

const PERIODS = ["MONTHLY", "QUARTERLY", "ANNUAL"] as const;

type BudgetRecord = {
  id: string;
  name: string;
  categoryId: string | null;
  branchId: string | null;
  period: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  notes: string | null;
};

export function BudgetFormDialog({
  trigger,
  budget,
  categories,
  branches,
}: {
  trigger: React.ReactElement;
  budget?: BudgetRecord;
  categories: { id: string; name: string }[];
  branches: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = budget
        ? await updateBudget(budget.id, {}, formData)
        : await createBudget({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      notify.success(budget ? "Budget updated" : "Budget created");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? "Edit Budget" : "New Budget"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={budget?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <Select name="categoryId" defaultValue={budget?.categoryId ?? "none"}>
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="branchId">Branch</Label>
              <Select name="branchId" defaultValue={budget?.branchId ?? "none"}>
                <SelectTrigger id="branchId" className="w-full">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All branches</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="period">Period</Label>
              <Select name="period" defaultValue={budget?.period ?? "MONTHLY"} required>
                <SelectTrigger id="period" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="periodStart">Start</Label>
              <Input id="periodStart" name="periodStart" type="date" defaultValue={budget?.periodStart.slice(0, 10)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="periodEnd">End</Label>
              <Input id="periodEnd" name="periodEnd" type="date" defaultValue={budget?.periodEnd.slice(0, 10)} required />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="amount">Budget Amount</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0.01" defaultValue={budget?.amount} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={budget?.notes ?? ""} rows={2} />
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
