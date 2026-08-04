import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProjectsTable } from "./projects-table";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await auth();
  const canManage =
    session?.user.role === "ADMIN" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "STAFF";

  const [projects, customers, vessels, consultants] = await Promise.all([
    db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true, consultant: true },
    }),
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.vessel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const referencedServiceIds = [
    ...new Set(projects.map((project) => project.serviceId).filter((id): id is string => id != null)),
  ];
  const services = await db.service.findMany({
    where: { OR: [{ isActive: true }, { id: { in: referencedServiceIds } }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Manage engagements from kickoff through closure.
        </p>
      </div>

      <ProjectsTable
        canManage={canManage}
        customers={customers}
        vessels={vessels}
        services={services}
        consultants={consultants}
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          customerId: project.customerId,
          customerName: project.customer?.name ?? null,
          vesselId: project.vesselId,
          serviceId: project.serviceId,
          consultantId: project.consultantId,
          consultantName: project.consultant.name,
          status: project.status,
          startDate: project.startDate ? project.startDate.toISOString() : null,
          endDate: project.endDate ? project.endDate.toISOString() : null,
          description: project.description,
        }))}
      />
    </div>
  );
}
