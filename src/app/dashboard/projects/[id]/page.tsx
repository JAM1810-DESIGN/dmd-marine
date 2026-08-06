import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { EditProjectButton } from "./edit-project-button";
import { DocumentsSection } from "./documents-section";
import { SchedulesSection } from "./schedules-section";
import { RequiredFormsSection } from "./required-forms-section";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({
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

  const [project, customers, vessels, consultants, forms] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        customer: true,
        vessel: true,
        service: true,
        consultant: true,
        booking: true,
        documents: { orderBy: { createdAt: "desc" } },
        schedules: { orderBy: { startAt: "asc" }, include: { consultant: true } },
        requiredForms: { orderBy: { order: "asc" }, include: { companyDocument: true } },
      },
    }),
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.vessel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.companyDocument.findMany({
      where: { category: "FORM" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const services = await db.service.findMany({
    where: { OR: [{ isActive: true }, ...(project?.serviceId ? [{ id: project.serviceId }] : [])] },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (!project) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Projects
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
            <Badge variant="outline">{project.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {project.customer?.name ?? "No customer"}
            {project.vessel && ` · ${project.vessel.name}`}
            {project.service && ` · ${project.service.name}`}
          </p>
          <p className="text-sm text-muted-foreground">Consultant: {project.consultant.name}</p>
          {project.description && (
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        {canManage && (
          <EditProjectButton
            project={{
              id: project.id,
              name: project.name,
              customerId: project.customerId,
              vesselId: project.vesselId,
              serviceId: project.serviceId,
              consultantId: project.consultantId,
              status: project.status,
              startDate: project.startDate ? project.startDate.toISOString() : null,
              endDate: project.endDate ? project.endDate.toISOString() : null,
              description: project.description,
            }}
            customers={customers}
            vessels={vessels}
            services={services}
            consultants={consultants}
          />
        )}
      </div>

      <SchedulesSection
        projectId={project.id}
        projectName={project.name}
        consultantId={project.consultantId}
        consultants={consultants}
        canManage={canManage}
        schedules={project.schedules.map((schedule) => ({
          id: schedule.id,
          title: schedule.title,
          type: schedule.type,
          startAt: schedule.startAt.toISOString(),
          endAt: schedule.endAt.toISOString(),
          consultantName: schedule.consultant.name,
        }))}
      />

      <RequiredFormsSection
        projectId={project.id}
        canManage={canManage}
        availableForms={forms}
        requiredForms={project.requiredForms.map((form) => ({
          id: form.id,
          companyDocumentId: form.companyDocumentId,
          title: form.companyDocument.title,
          url: form.companyDocument.url,
          required: form.required,
          completed: form.completed,
          order: form.order,
        }))}
      />

      <DocumentsSection
        projectId={project.id}
        canManage={canManage}
        storageConfigured={isStorageConfigured}
        documents={project.documents.map((doc) => ({
          id: doc.id,
          fileName: doc.fileName,
          url: doc.url,
          category: doc.category,
          sizeBytes: doc.sizeBytes,
          createdAt: doc.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
