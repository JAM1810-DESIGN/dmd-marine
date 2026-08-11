import type { Metadata } from "next";
import { startOfMonth, endOfMonth } from "date-fns";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { CurrencyAmount } from "@/components/shared/currency-amount";
import { getPaymentsByMethod } from "@/lib/finance-calculations";
import { PaymentsTable } from "./payments-table";

export const metadata: Metadata = { title: "Payments" };

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CREDIT_CARD: "Credit card",
  DEBIT_CARD: "Debit card",
  GCASH: "GCash",
  MAYA: "Maya",
  CHECK: "Check",
  OTHER: "Other",
};

export default async function PaymentsPage() {
  const session = await auth();
  if (session?.user.role === "STAFF") {
    return <AccessDenied message="Payments are restricted to Admin, Manager, and Finance Officer roles." />;
  }

  const now = new Date();
  const monthRange = { start: startOfMonth(now), end: endOfMonth(now) };

  const [payments, byMethod] = await Promise.all([
    db.payment.findMany({
      orderBy: { paymentDate: "desc" },
      include: { invoice: { include: { customer: true } } },
    }),
    getPaymentsByMethod(monthRange),
  ]);

  const monthTotal = byMethod.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground">All incoming payments across every invoice.</p>
      </div>

      {/* This-month collection by method */}
      <div className="rounded-xl border-t-[3px] border-t-teal-500 bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Collected this month</h2>
          <span className="text-sm font-medium">
            <CurrencyAmount amountPhp={monthTotal} />
          </span>
        </div>
        {byMethod.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded this month.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {byMethod.map((row) => (
              <div key={row.method} className="rounded-lg bg-secondary/40 p-3">
                <p className="text-xs text-muted-foreground">{METHOD_LABELS[row.method] ?? row.method}</p>
                <p className="text-lg font-semibold">
                  <CurrencyAmount amountPhp={row.amount} />
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.count} payment{row.count === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        )}
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
