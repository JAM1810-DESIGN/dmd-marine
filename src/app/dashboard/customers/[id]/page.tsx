import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerFormDialog } from "../customer-form-dialog";
import { VesselsSection } from "./vessels-section";
import { ContactHistorySection } from "./contact-history-section";

export const metadata: Metadata = { title: "Customer Profile" };

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

  const [customer, companies] = await Promise.all([
    db.customer.findUnique({
      where: { id },
      include: {
        company: true,
        vessels: { orderBy: { createdAt: "desc" } },
        contactHistory: { orderBy: { occurredAt: "desc" }, include: { createdBy: true } },
        bookings: { orderBy: { createdAt: "desc" }, include: { service: true } },
      },
    }),
    db.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!customer) notFound();

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
            customer={customer}
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

      <VesselsSection customerId={customer.id} vessels={customer.vessels} canManage={canManage} />

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
          <p className="px-4 pb-4 text-sm text-muted-foreground">No linked bookings.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {customer.bookings.map((booking) => (
              <li key={booking.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{booking.service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {booking.createdAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
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
