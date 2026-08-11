"use client";

import { useState, useTransition } from "react";
import { CurrencyAmount } from "@/components/shared/currency-amount";
import { useCurrency } from "@/components/shared/currency-provider";
import { notify } from "@/lib/notify";
import { updateInvoiceItemPrice } from "../actions";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type ItemRow = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
};

function UnitPriceCell({ invoiceId, item }: { invoiceId: string; item: ItemRow }) {
  const { currency, fromPhp, toPhp } = useCurrency();
  // Edited in the selected display currency; stored back in PHP.
  const [value, setValue] = useState(String(round2(fromPhp(item.unitPrice))));
  const [pending, startTransition] = useTransition();

  function save() {
    const display = Number(value);
    const php = round2(toPhp(display));
    if (!(display >= 0) || Math.abs(php - item.unitPrice) < 0.005) {
      setValue(String(round2(fromPhp(item.unitPrice))));
      return;
    }
    startTransition(async () => {
      const result = await updateInvoiceItemPrice(invoiceId, item.id, php);
      if (result.error) {
        notify.error(result.error);
        setValue(String(round2(fromPhp(item.unitPrice))));
      } else {
        notify.success("Price updated");
      }
    });
  }

  return (
    <>
      <span className="inline-flex items-center justify-end gap-1 print:hidden">
        <span className="text-xs text-muted-foreground">{currency}</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-24 rounded border border-border bg-transparent px-1.5 py-0.5 text-right text-sm outline-none focus:border-ring"
          aria-label={`Unit price for ${item.description}`}
        />
      </span>
      <span className="hidden print:inline">
        <CurrencyAmount amountPhp={item.unitPrice} />
      </span>
    </>
  );
}

export function InvoiceItemsEditor({
  invoiceId,
  items,
  editable,
}: {
  invoiceId: string;
  items: ItemRow[];
  editable: boolean;
}) {
  const { currency } = useCurrency();
  return (
    <table className="mt-6 w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
          <th className="pb-2">Description</th>
          <th className="pb-2 text-right">Qty</th>
          <th className="pb-2 text-right">Unit Price</th>
          <th className="pb-2 text-right">Tax</th>
          <th className="pb-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-border/60">
            <td className="py-2">{item.description}</td>
            <td className="py-2 text-right">{item.quantity}</td>
            <td className="py-2 text-right">
              {editable ? (
                <UnitPriceCell key={`${item.id}-${currency}`} invoiceId={invoiceId} item={item} />
              ) : (
                <CurrencyAmount amountPhp={item.unitPrice} />
              )}
            </td>
            <td className="py-2 text-right">{item.taxRate}%</td>
            <td className="py-2 text-right">
              <CurrencyAmount amountPhp={item.lineTotal} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
