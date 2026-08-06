"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { requireRole } from "@/lib/rbac";
import { categorySchema, serviceSchema } from "@/lib/validations/service";

export type ActionState = { error?: string; success?: boolean };

async function uniqueSlug(name: string, isTaken: (slug: string) => Promise<boolean>) {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await isTaken(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}

function parseFaq(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Categories ──────────────────────────────────────────────────────────────

export async function createCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    order: formData.get("order") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const slug = await uniqueSlug(
    parsed.data.name,
    async (candidate) => (await db.serviceCategory.count({ where: { slug: candidate } })) > 0,
  );

  await db.serviceCategory.create({ data: { ...parsed.data, slug } });
  revalidatePath("/dashboard/services");
  return { success: true };
}

export async function updateCategory(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    order: formData.get("order") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await db.serviceCategory.update({ where: { id }, data: parsed.data });
  revalidatePath("/dashboard/services");
  return { success: true };
}

export async function toggleCategoryActive(id: string, isActive: boolean) {
  await requireRole("ADMIN", "MANAGER");
  await db.serviceCategory.update({ where: { id }, data: { isActive } });
  revalidatePath("/dashboard/services");
}

// ── Services ─────────────────────────────────────────────────────────────────

export async function createService(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER");

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    parentServiceId: formData.get("parentServiceId") || undefined,
    overview: formData.get("overview") || undefined,
    benefits: formData.get("benefits") || undefined,
    scope: formData.get("scope") || undefined,
    process: formData.get("process") || undefined,
    defaultConsultantId: formData.get("defaultConsultantId") || undefined,
    order: formData.get("order") || 0,
    faq: parseFaq(formData.get("faq")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  if (parsed.data.parentServiceId) {
    const parent = await db.service.findUnique({
      where: { id: parsed.data.parentServiceId },
      select: { parentServiceId: true, isActive: true },
    });
    if (!parent || parent.parentServiceId || !parent.isActive) {
      return { error: "Parent service must be an active, top-level service." };
    }
  }

  const slug = await uniqueSlug(
    parsed.data.name,
    async (candidate) => (await db.service.count({ where: { slug: candidate } })) > 0,
  );

  const { faq, ...rest } = parsed.data;

  try {
    await db.service.create({
      data: { ...rest, slug, faq: faq as unknown as Prisma.InputJsonValue },
    });
  } catch {
    return { error: "Could not create the service. Please try again." };
  }

  revalidatePath("/dashboard/services");
  return { success: true };
}

export async function updateService(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER");

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    parentServiceId: formData.get("parentServiceId") || undefined,
    overview: formData.get("overview") || undefined,
    benefits: formData.get("benefits") || undefined,
    scope: formData.get("scope") || undefined,
    process: formData.get("process") || undefined,
    defaultConsultantId: formData.get("defaultConsultantId") || undefined,
    order: formData.get("order") || 0,
    faq: parseFaq(formData.get("faq")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  if (parsed.data.parentServiceId) {
    if (parsed.data.parentServiceId === id) {
      return { error: "A service cannot be its own parent." };
    }
    const childCount = await db.service.count({ where: { parentServiceId: id } });
    if (childCount > 0) {
      return { error: "This service has its own sub-services and cannot become a child service." };
    }
    const parent = await db.service.findUnique({
      where: { id: parsed.data.parentServiceId },
      select: { parentServiceId: true, isActive: true },
    });
    if (!parent || parent.parentServiceId || !parent.isActive) {
      return { error: "Parent service must be an active, top-level service." };
    }
  }

  const { faq, ...rest } = parsed.data;

  await db.service.update({
    where: { id },
    data: { ...rest, faq: faq as unknown as Prisma.InputJsonValue },
  });

  revalidatePath("/dashboard/services");
  return { success: true };
}

export async function toggleServiceActive(id: string, isActive: boolean) {
  await requireRole("ADMIN", "MANAGER");
  await db.service.update({ where: { id }, data: { isActive } });
  revalidatePath("/dashboard/services");
}

// ── Required Forms ──────────────────────────────────────────────────────────

export async function addServiceRequiredForm(serviceId: string, companyDocumentId: string) {
  await requireRole("ADMIN", "MANAGER");

  const maxOrder = await db.serviceRequiredForm.aggregate({
    where: { serviceId },
    _max: { order: true },
  });

  await db.serviceRequiredForm.create({
    data: {
      serviceId,
      companyDocumentId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/dashboard/services");
}

export async function removeServiceRequiredForm(id: string) {
  await requireRole("ADMIN", "MANAGER");
  await db.serviceRequiredForm.delete({ where: { id } });
  revalidatePath("/dashboard/services");
}

export async function toggleServiceRequiredFormRequired(id: string, required: boolean) {
  await requireRole("ADMIN", "MANAGER");
  await db.serviceRequiredForm.update({ where: { id }, data: { required } });
  revalidatePath("/dashboard/services");
}

export async function reorderServiceRequiredForm(id: string, direction: "up" | "down") {
  await requireRole("ADMIN", "MANAGER");

  const current = await db.serviceRequiredForm.findUniqueOrThrow({ where: { id } });
  const neighbor = await db.serviceRequiredForm.findFirst({
    where: {
      serviceId: current.serviceId,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await db.$transaction([
    db.serviceRequiredForm.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    db.serviceRequiredForm.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);

  revalidatePath("/dashboard/services");
}
