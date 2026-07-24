import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { refreshOverdueInvoices } from "./actions";
import { InvoicesTable } from "./invoices-table";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const session = await auth();
  if (session?.user.role === "STAFF") {
    return <AccessDenied message="Invoices are restricted to Admin, Manager, and Finance Officer roles." />;
  }
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "FINANCE_OFFICER";

  await refreshOverdueInvoices();

  const [invoices, customers, services, branches] = await Promise.all([
    db.invoice.findMany({ orderBy: { issueDate: "desc" }, include: { customer: true } }),
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.service.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground">Billing and income for services delivered.</p>
      </div>

      <InvoicesTable
        canManage={canManage}
        customers={customers}
        services={services}
        branches={branches}
        invoices={invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer?.name ?? null,
          issueDate: invoice.issueDate.toISOString(),
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
          totalAmount: Number(invoice.totalAmount),
          status: invoice.status,
        }))}
      />
    </div>
  );
}
