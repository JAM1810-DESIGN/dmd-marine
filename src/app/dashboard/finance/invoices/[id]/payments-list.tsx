"use client";

import { useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { refundPayment } from "../actions";

type PaymentRow = {
  id: string;
  paymentDate: string;
  amount: number;
  method: string;
  status: string;
  referenceNumber: string | null;
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function PaymentsList({ payments, canManage }: { payments: PaymentRow[]; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">No payments recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="print:hidden" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="text-sm">{new Date(payment.paymentDate).toLocaleDateString("en-US")}</TableCell>
            <TableCell className="text-sm">{payment.method.replace(/_/g, " ")}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{payment.referenceNumber ?? "—"}</TableCell>
            <TableCell className="text-sm font-medium">{formatCurrency(payment.amount)}</TableCell>
            <TableCell>
              <Badge variant={payment.status === "REFUNDED" ? "destructive" : "default"}>{payment.status}</Badge>
            </TableCell>
            <TableCell className="print:hidden">
              {canManage && payment.status === "COMPLETED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await refundPayment(payment.id);
                      notify.success("Payment refunded");
                    })
                  }
                >
                  Refund
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
