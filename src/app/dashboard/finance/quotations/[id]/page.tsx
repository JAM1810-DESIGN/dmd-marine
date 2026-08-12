import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { QuotationEditor, type QuotationRecord } from "../quotation-editor";

export const metadata: Metadata = { title: "Quotation" };

export default async function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "FINANCE_OFFICER") {
    return <AccessDenied message="Quotations are restricted to Admin, Manager, and Finance Officer roles." />;
  }

  const [quotation, customers] = await Promise.all([
    db.quotation.findUnique({ where: { id }, include: { items: { orderBy: { order: "asc" } } } }),
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!quotation) notFound();

  const record: QuotationRecord = {
    id: quotation.id,
    quoteNumber: quotation.quoteNumber,
    title: quotation.title,
    billTo: quotation.billTo,
    attention: quotation.attention,
    vesselName: quotation.vesselName,
    location: quotation.location,
    currency: quotation.currency,
    quoteDate: quotation.quoteDate.toISOString(),
    validityDays: quotation.validityDays,
    paymentTerms: quotation.paymentTerms,
    conditions: quotation.conditions,
    scopeTitle: quotation.scopeTitle,
    scope: quotation.scope,
    reporting: quotation.reporting,
    taxRatePercent: Number(quotation.taxRatePercent),
    customerId: quotation.customerId,
    items: quotation.items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
    })),
  };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/dashboard/finance/quotations" className="no-print inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Quotations
      </Link>
      <QuotationEditor quotation={record} customers={customers} />
    </div>
  );
}
