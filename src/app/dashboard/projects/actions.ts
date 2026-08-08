"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { copyServiceRequiredFormsToProject } from "@/lib/required-forms";
import { isStorageConfigured, uploadFile } from "@/lib/storage";
import { projectSchema } from "@/lib/validations/project";
import type { ProjectStatus } from "@/generated/prisma/enums";

export type ActionState = { error?: string; success?: boolean };

const PROJECT_ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;

function parseProject(formData: FormData) {
  return projectSchema.safeParse({
    name: formData.get("name"),
    customerId: formData.get("customerId") || undefined,
    vesselId: formData.get("vesselId") || undefined,
    serviceId: formData.get("serviceId") || undefined,
    consultantId: formData.get("consultantId"),
    status: formData.get("status"),
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
  });
}

async function resolveCompanyId(customerId: string | null) {
  if (!customerId) return null;
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  return customer?.companyId ?? null;
}

export async function createProject(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...PROJECT_ROLES);

  const parsed = parseProject(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { startDate, endDate, ...rest } = parsed.data;
  const companyId = await resolveCompanyId(rest.customerId);

  const project = await db.project.create({
    data: {
      ...rest,
      companyId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });

  if (project.serviceId) {
    await copyServiceRequiredFormsToProject(project.id, project.serviceId);
  }

  revalidatePath("/dashboard/projects");
  return { success: true };
}

export async function updateProject(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...PROJECT_ROLES);

  const parsed = parseProject(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { startDate, endDate, ...rest } = parsed.data;
  const companyId = await resolveCompanyId(rest.customerId);

  await db.project.update({
    where: { id },
    data: {
      ...rest,
      companyId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${id}`);
  return { success: true };
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  await requireRole(...PROJECT_ROLES);
  await db.project.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${id}`);
}

export async function createProjectFromBooking(
  bookingId: string,
): Promise<{ error?: string; projectId?: string }> {
  await requireRole(...PROJECT_ROLES);

  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { project: true },
  });
  if (booking.project) {
    return { projectId: booking.project.id };
  }
  if (!booking.assignedConsultantId) {
    return { error: "Assign a consultant to this booking before creating a project." };
  }

  const project = await db.project.create({
    data: {
      name: `${booking.customerName} — ${booking.vesselName ?? "Project"}`,
      customerId: booking.customerId,
      companyId: booking.companyId,
      vesselId: booking.vesselId,
      serviceId: booking.serviceId,
      bookingId: booking.id,
      consultantId: booking.assignedConsultantId,
      status: "NEW",
      location: booking.port,
    },
  });

  await copyServiceRequiredFormsToProject(project.id, booking.serviceId);

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/bookings");
  return { projectId: project.id };
}

export async function uploadProjectDocument(
  projectId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...PROJECT_ROLES);

  if (!isStorageConfigured) {
    return { error: "File storage is not configured yet." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }

  const category = formData.get("category") === "PROJECT_REPORT" ? "PROJECT_REPORT" : "PROJECT_DOCUMENT";
  const uploaded = await uploadFile(file, `projects/${projectId}`);

  await db.document.create({
    data: {
      fileName: uploaded.fileName,
      url: uploaded.url,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      category,
      projectId,
    },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}

// ── Required Forms ──────────────────────────────────────────────────────────

export async function addProjectRequiredForm(projectId: string, companyDocumentId: string) {
  await requireRole(...PROJECT_ROLES);

  const maxOrder = await db.projectRequiredForm.aggregate({
    where: { projectId },
    _max: { order: true },
  });

  await db.projectRequiredForm.create({
    data: {
      projectId,
      companyDocumentId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function removeProjectRequiredForm(projectId: string, id: string) {
  await requireRole(...PROJECT_ROLES);
  await db.projectRequiredForm.delete({ where: { id } });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function toggleProjectRequiredFormRequired(
  projectId: string,
  id: string,
  required: boolean,
) {
  await requireRole(...PROJECT_ROLES);
  await db.projectRequiredForm.update({ where: { id }, data: { required } });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function toggleProjectRequiredFormCompleted(
  projectId: string,
  id: string,
  completed: boolean,
) {
  await requireRole(...PROJECT_ROLES);
  await db.projectRequiredForm.update({
    where: { id },
    data: { completed, completedAt: completed ? new Date() : null },
  });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function reorderProjectRequiredForm(
  projectId: string,
  id: string,
  direction: "up" | "down",
) {
  await requireRole(...PROJECT_ROLES);

  const current = await db.projectRequiredForm.findUniqueOrThrow({ where: { id } });
  const neighbor = await db.projectRequiredForm.findFirst({
    where: {
      projectId: current.projectId,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await db.$transaction([
    db.projectRequiredForm.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    db.projectRequiredForm.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);

  revalidatePath(`/dashboard/projects/${projectId}`);
}
