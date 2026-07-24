import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { AccessDenied } from "@/components/shared/access-denied";
import { Badge } from "@/components/ui/badge";
import { InvoiceActions } from "./invoice-actions";
import { PaymentsList } from "./payments-list";

export const metadata: Metadata = { title: "Invoice" };

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role === "STAFF") {
    return <AccessDenied message="Invoices are restricted to Admin, Manager, and Finance Officer roles." />;
  }
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "FINANCE_OFFICER";

  const [invoice, settings] = await Promise.all([
    db.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        company: true,
        vessel: true,
        branch: true,
        items: { include: { service: true } },
        payments: { orderBy: { paymentDate: "desc" } },
      },
    }),
    getSiteSettings(),
  ]);

  if (!invoice) notFound();

  const paidTotal = invoice.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Math.max(Number(invoice.totalAmount) - paidTotal, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <Link
          href="/dashboard/finance/invoices"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Invoices
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Badge variant="outline">{invoice.status}</Badge>
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} balanceDue={balanceDue} canManage={canManage} />
      </div>

      <div className="rounded-xl bg-card p-8 ring-1 ring-foreground/10 print:rounded-none print:p-0 print:ring-0">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
          <div>
            <h1 className="font-heading text-xl font-semibold text-foreground">{settings.companyName}</h1>
            <p className="text-sm text-muted-foreground">{settings.address}</p>
            <p className="text-sm text-muted-foreground">{[settings.email, settings.phone].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="text-right">
            <h2 className="font-heading text-2xl font-semibold text-foreground">INVOICE</h2>
            <p className="text-sm text-muted-foreground">{invoice.invoiceNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 border-b border-border py-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Billed To</p>
            <p className="text-sm font-medium text-foreground">{invoice.customer?.name ?? invoice.company?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{invoice.customer?.email ?? invoice.company?.email ?? ""}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Vessel</p>
            <p className="text-sm text-foreground">{invoice.vessel?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Dates</p>
            <p className="text-sm text-foreground">Issued: {formatDate(invoice.issueDate)}</p>
            <p className="text-sm text-foreground">Due: {formatDate(invoice.dueDate)}</p>
          </div>
        </div>

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
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{Number(item.quantity)}</td>
                <td className="py-2 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                <td className="py-2 text-right">{Number(item.taxRate)}%</td>
                <td className="py-2 text-right">{formatCurrency(Number(item.lineTotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-56 justify-between"><span>Subtotal</span><span>{formatCurrency(Number(invoice.subtotal))}</span></div>
          <div className="flex w-56 justify-between"><span>Tax</span><span>{formatCurrency(Number(invoice.taxAmount))}</span></div>
          <div className="flex w-56 justify-between"><span>Discount</span><span>-{formatCurrency(Number(invoice.discountAmount))}</span></div>
          <div className="flex w-56 justify-between font-semibold"><span>Total</span><span>{formatCurrency(Number(invoice.totalAmount))}</span></div>
          <div className="flex w-56 justify-between text-muted-foreground"><span>Paid</span><span>{formatCurrency(paidTotal)}</span></div>
          <div className="flex w-56 justify-between font-semibold text-navy"><span>Balance Due</span><span>{formatCurrency(balanceDue)}</span></div>
        </div>

        {invoice.paymentTerms && (
          <p className="mt-6 text-sm text-muted-foreground"><strong>Payment Terms:</strong> {invoice.paymentTerms}</p>
        )}
        {invoice.notes && <p className="mt-2 text-sm text-muted-foreground">{invoice.notes}</p>}
      </div>

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 print:hidden">
        <h2 className="mb-2 font-heading text-base font-semibold">Payments</h2>
        <PaymentsList
          canManage={canManage}
          payments={invoice.payments.map((p) => ({
            id: p.id,
            paymentDate: p.paymentDate.toISOString(),
            amount: Number(p.amount),
            method: p.method,
            status: p.status,
            referenceNumber: p.referenceNumber,
          }))}
        />
      </div>
    </div>
  );
}
