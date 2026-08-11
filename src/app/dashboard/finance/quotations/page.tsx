import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { QuotationsTable, type QuotationRow } from "./quotations-table";

export const metadata: Metadata = { title: "Quotations" };

export default async function QuotationsPage() {
  const session = await auth();
  const role = session?.user.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "FINANCE_OFFICER") {
    return <AccessDenied message="Quotations are restricted to Admin, Manager, and Finance Officer roles." />;
  }

  const quotations = await db.quotation.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { select: { quantity: true, unitPrice: true } } },
  });

  const rows: QuotationRow[] = quotations.map((q) => {
    const subtotal = q.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
    const total = subtotal + (subtotal * Number(q.taxRatePercent)) / 100;
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      title: q.title,
      billTo: q.billTo,
      vesselName: q.vesselName,
      currency: q.currency,
      total,
      status: q.status,
      quoteDate: q.quoteDate.toISOString(),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Quotations</h1>
        <p className="text-sm text-muted-foreground">Editable bunker-survey quotations — save, print, or export to PDF.</p>
      </div>
      <QuotationsTable quotations={rows} />
    </div>
  );
}
