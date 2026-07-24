"use client";

import { useTransition } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { markInvoiceSent, cancelInvoice } from "../actions";
import { RecordPaymentDialog } from "./record-payment-dialog";

export function InvoiceActions({
  invoiceId,
  status,
  balanceDue,
  canManage,
}: {
  invoiceId: string;
  status: string;
  balanceDue: number;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {canManage && status === "DRAFT" && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(async () => { await markInvoiceSent(invoiceId); notify.success("Invoice sent"); })}
        >
          Mark as Sent
        </Button>
      )}
      {canManage && balanceDue > 0 && status !== "DRAFT" && status !== "CANCELLED" && (
        <RecordPaymentDialog invoiceId={invoiceId} balanceDue={balanceDue} />
      )}
      {canManage && status !== "CANCELLED" && status !== "PAID" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => startTransition(async () => { await cancelInvoice(invoiceId); notify.success("Invoice cancelled"); })}
        >
          Cancel
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => window.print()}>
        <Printer className="size-4" />
        Print / Save PDF
      </Button>
    </div>
  );
}
