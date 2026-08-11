"use client";

import { useState, useTransition } from "react";
import { CurrencyAmount } from "@/components/shared/currency-amount";
import { notify } from "@/lib/notify";
import { updateInvoiceItemPrice } from "../actions";

export type ItemRow = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
};

function UnitPriceCell({ invoiceId, item }: { invoiceId: string; item: ItemRow }) {
  const [value, setValue] = useState(String(item.unitPrice));
  const [pending, startTransition] = useTransition();

  function save() {
    const price = Number(value);
    if (!(price >= 0) || price === item.unitPrice) {
      setValue(String(item.unitPrice));
      return;
    }
    startTransition(async () => {
      const result = await updateInvoiceItemPrice(invoiceId, item.id, price);
      if (result.error) {
        notify.error(result.error);
        setValue(String(item.unitPrice));
      } else {
        notify.success("Price updated");
      }
    });
  }

  return (
    <>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-24 rounded border border-border bg-transparent px-1.5 py-0.5 text-right text-sm outline-none focus:border-ring print:hidden"
        aria-label={`Unit price for ${item.description}`}
      />
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
                <UnitPriceCell invoiceId={invoiceId} item={item} />
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
