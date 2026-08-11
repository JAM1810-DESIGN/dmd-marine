import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, CalendarClock, FolderKanban, CheckCircle2, Wallet, MapPin } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Consultant Profile" };

const php = (amount: number) =>
  amount.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

const AVAILABILITY_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  NOT_AVAILABLE: "Not available",
  ONBOARD: "Onboard",
};

function shortDate(date: Date | null) {
  return date ? date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "No date";
}

export default async function ConsultantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return <AccessDenied message="Only administrators can view consultant profiles." />;
  }

  const now = new Date();
  const [consultant, activeBookings, activeProjects, completedCount, paidInvoices, upcoming] =
    await Promise.all([
      db.user.findUnique({ where: { id } }),
      db.booking.findMany({
        where: { assignedConsultantId: id, status: { notIn: ["CANCELLED", "COMPLETED"] } },
        orderBy: [{ preferredDate: "asc" }, { createdAt: "desc" }],
        include: { service: { select: { name: true } } },
      }),
      db.project.findMany({
        where: { consultantId: id, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
      }),
      db.project.count({ where: { consultantId: id, status: "COMPLETED" } }),
      db.invoice.findMany({
        where: { status: "PAID", project: { consultantId: id } },
        select: { totalAmount: true },
      }),
      db.schedule.findMany({
        where: { consultantId: id, startAt: { gte: now } },
        orderBy: { startAt: "asc" },
        take: 10,
      }),
    ]);

  if (!consultant) notFound();

  const revenue = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/consultants"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Consultants
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{consultant.name}</h1>
            <Badge variant={consultant.isActive ? "default" : "outline"}>
              {consultant.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">{AVAILABILITY_LABELS[consultant.availability] ?? consultant.availability}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {consultant.email}
            {consultant.phone && ` · ${consultant.phone}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {consultant.rank && <Badge variant="outline">{consultant.rank}</Badge>}
            {consultant.baseLocations.map((location) => (
              <Badge key={location} variant="outline">
                <MapPin className="mr-1 size-3" />
                {location}
              </Badge>
            ))}
          </div>
          {consultant.address && (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{consultant.address}</p>
          )}
          {consultant.vesselExperience && (
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Vessel experience: </span>
              {consultant.vesselExperience}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarClock} tone="info" label="Active bookings" value={activeBookings.length} />
        <StatCard icon={FolderKanban} tone="primary" label="Active projects" value={activeProjects.length} />
        <StatCard icon={CheckCircle2} tone="success" label="Completed projects" value={completedCount} />
        <StatCard icon={Wallet} tone="accent" label="Revenue generated" value={php(revenue)} subtitle="Paid invoices" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border-t-[3px] border-t-teal-500 bg-card ring-1 ring-foreground/10">
          <div className="p-4">
            <h2 className="font-heading text-base font-semibold">Assigned bookings</h2>
            <p className="text-sm text-muted-foreground">Open work assigned to this consultant.</p>
          </div>
          {activeBookings.length === 0 ? (
            <EmptyState className="border-none" title="No open bookings" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {activeBookings.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{booking.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.service.name} · {shortDate(booking.preferredDate)}
                    </p>
                  </div>
                  <Badge variant="outline">{booking.status.replace(/_/g, " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border-t-[3px] border-t-teal-500 bg-card ring-1 ring-foreground/10">
          <div className="p-4">
            <h2 className="font-heading text-base font-semibold">Active projects</h2>
            <p className="text-sm text-muted-foreground">Projects currently in progress.</p>
          </div>
          {activeProjects.length === 0 ? (
            <EmptyState className="border-none" title="No active projects" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {activeProjects.map((project) => (
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
      </div>

      <div className="rounded-xl border-t-[3px] border-t-teal-500 bg-card ring-1 ring-foreground/10">
        <div className="p-4">
          <h2 className="font-heading text-base font-semibold">Upcoming schedule</h2>
          <p className="text-sm text-muted-foreground">Next appointments for this consultant.</p>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState className="border-none" title="Nothing scheduled" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {upcoming.map((schedule) => (
              <li key={schedule.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <span className="w-28 shrink-0 text-muted-foreground">
                  {format(schedule.startAt, "d MMM, HH:mm")}
                </span>
                <div>
                  <p className="font-medium text-foreground">{schedule.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {schedule.type.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
