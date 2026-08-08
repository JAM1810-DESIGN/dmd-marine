// src/app/dashboard/consultants/page.tsx
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { ConsultantsTable } from "./consultants-table";

export const metadata: Metadata = { title: "Consultants" };

export default async function ConsultantsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return <AccessDenied message="Only administrators can manage consultants." />;
  }

  const [consultants, activeBookingGroups, projectGroups, paidInvoices] = await Promise.all([
    db.user.findMany({ orderBy: { name: "asc" } }),
    db.booking.groupBy({
      by: ["assignedConsultantId"],
      where: { assignedConsultantId: { not: null }, status: { notIn: ["CANCELLED", "COMPLETED"] } },
      _count: true,
    }),
    db.project.groupBy({
      by: ["consultantId", "status"],
      _count: true,
    }),
    db.invoice.findMany({
      where: { status: "PAID", projectId: { not: null } },
      select: { totalAmount: true, project: { select: { consultantId: true } } },
    }),
  ]);

  const activeBookingsBy = new Map<string, number>();
  for (const group of activeBookingGroups) {
    if (group.assignedConsultantId) activeBookingsBy.set(group.assignedConsultantId, group._count);
  }

  const activeProjectsBy = new Map<string, number>();
  const completedProjectsBy = new Map<string, number>();
  for (const group of projectGroups) {
    if (group.status === "ACTIVE") {
      activeProjectsBy.set(group.consultantId, (activeProjectsBy.get(group.consultantId) ?? 0) + group._count);
    } else if (group.status === "COMPLETED") {
      completedProjectsBy.set(group.consultantId, (completedProjectsBy.get(group.consultantId) ?? 0) + group._count);
    }
  }

  const revenueBy = new Map<string, number>();
  for (const invoice of paidInvoices) {
    const consultantId = invoice.project?.consultantId;
    if (consultantId) revenueBy.set(consultantId, (revenueBy.get(consultantId) ?? 0) + Number(invoice.totalAmount));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Consultants</h1>
        <p className="text-sm text-muted-foreground">
          Maritime consultant directory — rank, workload, and performance.
        </p>
      </div>

      <ConsultantsTable
        consultants={consultants.map((consultant) => ({
          id: consultant.id,
          name: consultant.name,
          email: consultant.email,
          rank: consultant.rank,
          vesselExperience: consultant.vesselExperience,
          phone: consultant.phone,
          address: consultant.address,
          baseLocations: consultant.baseLocations,
          availability: consultant.availability,
          isActive: consultant.isActive,
          activeBookings: activeBookingsBy.get(consultant.id) ?? 0,
          activeProjects: activeProjectsBy.get(consultant.id) ?? 0,
          completedProjects: completedProjectsBy.get(consultant.id) ?? 0,
          revenue: revenueBy.get(consultant.id) ?? 0,
        }))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
