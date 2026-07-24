import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { PaymentsTable } from "./payments-table";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const session = await auth();
  if (session?.user.role === "STAFF") {
    return <AccessDenied message="Payments are restricted to Admin, Manager, and Finance Officer roles." />;
  }

  const payments = await db.payment.findMany({
    orderBy: { paymentDate: "desc" },
    include: { invoice: { include: { customer: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground">All incoming payments across every invoice.</p>
      </div>

      <PaymentsTable
        payments={payments.map((payment) => ({
          id: payment.id,
          paymentDate: payment.paymentDate.toISOString(),
          customerName: payment.invoice.customer?.name ?? null,
          invoiceId: payment.invoiceId,
          invoiceNumber: payment.invoice.invoiceNumber,
          amount: Number(payment.amount),
          method: payment.method,
          status: payment.status,
          referenceNumber: payment.referenceNumber,
        }))}
      />
    </div>
  );
}
