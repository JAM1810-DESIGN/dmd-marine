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
import { recordPayment } from "../actions";

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "GCASH", "MAYA", "CHECK", "OTHER"] as const;

export function RecordPaymentDialog({ invoiceId, balanceDue }: { invoiceId: string; balanceDue: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await recordPayment(invoiceId, {}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      notify.success("Payment recorded");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Record Payment</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="paymentDate">Date</Label>
              <Input id="paymentDate" name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0.01" defaultValue={balanceDue.toFixed(2)} required />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="method">Method</Label>
            <Select name="method" defaultValue="BANK_TRANSFER" required>
              <SelectTrigger id="method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input id="referenceNumber" name="referenceNumber" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="self-end">
            {isPending ? "Saving..." : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
