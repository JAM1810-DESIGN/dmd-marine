import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Wallet, Clock, CalendarCheck, FolderOpen } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { CustomerFormDialog } from "../customer-form-dialog";
import { VesselsSection } from "./vessels-section";
import { ContactHistorySection } from "./contact-history-section";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Customer Profile" };

const ACTIVE_PROJECT_STATUSES = ["NEW", "PLANNING", "SCHEDULED", "ACTIVE"] as const;

const php = (amount: number) =>
  amount.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canManage =
    session?.user.role === "ADMIN" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "STAFF";

  const [customer, companies, billedAgg, collectedAgg, activeProjectCount] = await Promise.all([
    db.customer.findUnique({
      where: { id },
      include: {
        company: true,
        vessels: { orderBy: { createdAt: "desc" } },
        contactHistory: { orderBy: { occurredAt: "desc" }, include: { createdBy: true } },
        bookings: { orderBy: { createdAt: "desc" }, include: { service: true } },
        projects: { orderBy: { createdAt: "desc" }, take: 8 },
        invoices: { orderBy: { issueDate: "desc" }, take: 8 },
      },
    }),
    db.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.invoice.aggregate({
      where: { customerId: id, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
    }),
    db.payment.aggregate({
      where: { status: "COMPLETED", invoice: { customerId: id } },
      _sum: { amount: true },
    }),
    db.project.count({ where: { customerId: id, status: { in: [...ACTIVE_PROJECT_STATUSES] } } }),
  ]);

  if (!customer) notFound();

  const collected = Number(collectedAgg._sum.amount ?? 0);
  const billed = Number(billedAgg._sum.totalAmount ?? 0);
  const outstanding = Math.max(0, billed - collected);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Customers
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            {customer.email ?? "No email"} {customer.phone && `· ${customer.phone}`}
          </p>
          {customer.company && (
            <Badge variant="outline" className="mt-2">
              {customer.company.name}
            </Badge>
          )}
          {customer.notes && (
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">{customer.notes}</p>
          )}
        </div>
        {canManage && (
          <CustomerFormDialog
            customer={{
              id: customer.id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              companyId: customer.companyId,
              notes: customer.notes,
            }}
            companies={companies}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="size-4" />
                Edit
              </Button>
            }
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          tone="success"
          label="Lifetime revenue"
          value={php(collected)}
          subtitle="Payments received"
        />
        <StatCard
          icon={Clock}
          tone="accent"
          label="Outstanding"
          value={php(outstanding)}
          subtitle="Billed, not yet paid"
        />
        <StatCard
          icon={CalendarCheck}
          tone="info"
          label="Bookings"
          value={customer.bookings.length}
        />
        <StatCard
          icon={FolderOpen}
          tone="primary"
          label="Active projects"
          value={activeProjectCount}
        />
      </div>

      <VesselsSection customerId={customer.id} vessels={customer.vessels} canManage={canManage} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="p-4">
            <h2 className="font-heading text-base font-semibold">Projects</h2>
            <p className="text-sm text-muted-foreground">Work delivered for this customer.</p>
          </div>
          {customer.projects.length === 0 ? (
            <EmptyState className="border-none" title="No projects yet" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {customer.projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40"
                  >
                    <span className="font-medium text-foreground">{project.name}</span>
                    <Badge variant="outline">{project.status.replace(/_/g, " ")}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="p-4">
            <h2 className="font-heading text-base font-semibold">Invoices</h2>
            <p className="text-sm text-muted-foreground">Billing history and balances.</p>
          </div>
          {customer.invoices.length === 0 ? (
            <EmptyState className="border-none" title="No invoices yet" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {customer.invoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/dashboard/finance/invoices/${invoice.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40"
                  >
                    <div>
                      <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{shortDate(invoice.issueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {php(Number(invoice.totalAmount))}
                      </p>
                      <Badge variant="outline">{invoice.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ContactHistorySection
        customerId={customer.id}
        canManage={canManage}
        entries={customer.contactHistory.map((entry) => ({
          id: entry.id,
          type: entry.type,
          summary: entry.summary,
          occurredAt: entry.occurredAt,
          createdByName: entry.createdBy?.name ?? null,
        }))}
      />

      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="p-4">
          <h2 className="font-heading text-base font-semibold">Bookings</h2>
          <p className="text-sm text-muted-foreground">Requests linked to this customer.</p>
        </div>
        {customer.bookings.length === 0 ? (
          <EmptyState className="border-none" title="No linked bookings" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {customer.bookings.map((booking) => (
              <li key={booking.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{booking.service.name}</p>
                  <p className="text-xs text-muted-foreground">{shortDate(booking.createdAt)}</p>
                </div>
                <Badge variant="outline">{booking.status.replace(/_/g, " ")}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
