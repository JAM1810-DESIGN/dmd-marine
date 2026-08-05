"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
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
import { CurrencyAmount } from "@/components/shared/currency-amount";
import { notify } from "@/lib/notify";
import { createInvoice, updateInvoice } from "./actions";

type LineItem = { description: string; serviceId: string; quantity: number; unitPrice: number; taxRate: number };

type InvoiceRecord = {
  id: string;
  customerId: string | null;
  companyId: string | null;
  vesselId: string | null;
  serviceId: string | null;
  bookingId: string | null;
  projectId: string | null;
  branchId: string | null;
  issueDate: string;
  dueDate: string | null;
  paymentTerms: string | null;
  notes: string | null;
  discountAmount: number;
  items: { description: string; serviceId: string | null; quantity: number; unitPrice: number; taxRate: number }[];
};

export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoice,
  customers,
  services,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: InvoiceRecord;
  customers: { id: string; name: string }[];
  services: { id: string; name: string }[];
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [discountAmount, setDiscountAmount] = useState(invoice?.discountAmount ?? 0);
  const [items, setItems] = useState<LineItem[]>(
    () =>
      invoice?.items.map((item) => ({
        description: item.description,
        serviceId: item.serviceId ?? "none",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      })) ?? [{ description: "", serviceId: "none", quantity: 1, unitPrice: 0, taxRate: 0 }],
  );

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100), 0);
  const total = Math.max(subtotal + taxTotal - discountAmount, 0);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleSubmit(formData: FormData) {
    formData.set(
      "items",
      JSON.stringify(items.map((item) => ({ ...item, serviceId: item.serviceId === "none" ? undefined : item.serviceId }))),
    );

    startTransition(async () => {
      const result = invoice
        ? await updateInvoice(invoice.id, {}, formData)
        : await createInvoice({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      notify.success(invoice ? "Invoice updated" : "Invoice created");
      onOpenChange(false);
      if (result.id) router.push(`/dashboard/finance/invoices/${result.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{invoice ? "Edit Invoice" : "New Invoice"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="customerId">Customer</Label>
              <Select name="customerId" defaultValue={invoice?.customerId ?? "none"}>
                <SelectTrigger id="customerId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="branchId">Branch</Label>
              <Select name="branchId" defaultValue={invoice?.branchId ?? "none"}>
                <SelectTrigger id="branchId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                name="issueDate"
                type="date"
                defaultValue={invoice?.issueDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" name="dueDate" type="date" defaultValue={invoice?.dueDate?.slice(0, 10) ?? ""} />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItems((cur) => [...cur, { description: "", serviceId: "none", quantity: 1, unitPrice: 0, taxRate: 0 }])}
              >
                <Plus className="size-4" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 rounded-lg border border-border p-2">
                <Select
                  value={item.serviceId}
                  onValueChange={(value) => {
                    const service = services.find((s) => s.id === value);
                    updateItem(index, {
                      serviceId: value ?? "none",
                      description: service ? service.name : item.description,
                    });
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="col-span-3"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                />
                <Input
                  className="col-span-1"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) || 0 })}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Tax %"
                  value={item.taxRate}
                  onChange={(e) => updateItem(index, { taxRate: Number(e.target.value) || 0 })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="col-span-1"
                  aria-label="Remove item"
                  disabled={items.length === 1}
                  onClick={() => setItems((cur) => cur.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input id="paymentTerms" name="paymentTerms" defaultValue={invoice?.paymentTerms ?? ""} placeholder="e.g. Net 30" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="discountAmount">Discount</Label>
              <Input
                id="discountAmount"
                name="discountAmount"
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={invoice?.notes ?? ""} rows={2} />
          </div>

          <div className="flex flex-col items-end gap-1 rounded-lg bg-secondary/40 p-3 text-sm">
            <div className="flex w-48 justify-between"><span>Subtotal</span><span><CurrencyAmount amountPhp={subtotal} /></span></div>
            <div className="flex w-48 justify-between"><span>Tax</span><span><CurrencyAmount amountPhp={taxTotal} /></span></div>
            <div className="flex w-48 justify-between"><span>Discount</span><span>-<CurrencyAmount amountPhp={discountAmount} /></span></div>
            <div className="flex w-48 justify-between font-semibold"><span>Total</span><span><CurrencyAmount amountPhp={total} /></span></div>
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
