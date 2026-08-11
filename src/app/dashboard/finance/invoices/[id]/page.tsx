import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { isStorageConfigured } from "@/lib/storage";
import { AccessDenied } from "@/components/shared/access-denied";
import { Badge } from "@/components/ui/badge";
import { CurrencyAmount } from "@/components/shared/currency-amount";
import { InvoiceActions } from "./invoice-actions";
import { InvoiceItemsEditor } from "./invoice-items-editor";
import { InvoiceAttachments } from "./invoice-attachments";
import { PaymentsList } from "./payments-list";

export const metadata: Metadata = { title: "Invoice" };

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
        attachments: { orderBy: { createdAt: "desc" } },
      },
    }),
    getSiteSettings(),
  ]);

  if (!invoice) notFound();

  const editable = canManage && invoice.status === "DRAFT";
  const canUpload = canManage && invoice.status !== "PAID" && invoice.status !== "CANCELLED";

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

        <InvoiceItemsEditor
          invoiceId={invoice.id}
          editable={editable}
          items={invoice.items.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            taxRate: Number(item.taxRate),
            lineTotal: Number(item.lineTotal),
          }))}
        />
        {editable && (
          <p className="mt-2 text-xs text-muted-foreground print:hidden">
            Draft — tap a unit price to edit; totals update automatically.
          </p>
        )}

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-56 justify-between"><span>Subtotal</span><span><CurrencyAmount amountPhp={Number(invoice.subtotal)} /></span></div>
          <div className="flex w-56 justify-between"><span>Tax</span><span><CurrencyAmount amountPhp={Number(invoice.taxAmount)} /></span></div>
          <div className="flex w-56 justify-between"><span>Discount</span><span>-<CurrencyAmount amountPhp={Number(invoice.discountAmount)} /></span></div>
          <div className="flex w-56 justify-between font-semibold"><span>Total</span><span><CurrencyAmount amountPhp={Number(invoice.totalAmount)} /></span></div>
          <div className="flex w-56 justify-between text-muted-foreground"><span>Paid</span><span><CurrencyAmount amountPhp={paidTotal} /></span></div>
          <div className="flex w-56 justify-between font-semibold text-navy"><span>Balance Due</span><span><CurrencyAmount amountPhp={balanceDue} /></span></div>
        </div>

        {invoice.paymentTerms && (
          <p className="mt-6 text-sm text-muted-foreground"><strong>Payment Terms:</strong> {invoice.paymentTerms}</p>
        )}
        {invoice.notes && <p className="mt-2 text-sm text-muted-foreground">{invoice.notes}</p>}
      </div>

      <InvoiceAttachments
        invoiceId={invoice.id}
        canManage={canManage}
        canUpload={canUpload}
        storageConfigured={isStorageConfigured}
        attachments={invoice.attachments.map((a) => ({ id: a.id, fileName: a.fileName, url: a.url }))}
      />

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
