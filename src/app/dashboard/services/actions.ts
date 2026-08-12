"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { requireRole } from "@/lib/rbac";
import { uploadFile, isStorageConfigured } from "@/lib/storage";
import { categorySchema, serviceSchema } from "@/lib/validations/service";

export type ActionState = { error?: string; success?: boolean };

// Refresh the public marketing pages that list or link services so dashboard
// changes (create/edit/price/enable/disable/delete) show on the website too.
function revalidatePublicServices() {
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/services/[slug]", "page");
  revalidatePath("/book-consultation");
}

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
  revalidatePublicServices();
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
  revalidatePublicServices();
  return { success: true };
}

export async function toggleCategoryActive(id: string, isActive: boolean) {
  await requireRole("ADMIN", "MANAGER");
  await db.serviceCategory.update({ where: { id }, data: { isActive } });
  revalidatePath("/dashboard/services");
  revalidatePublicServices();
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
    basePrice: formData.get("basePrice") || undefined,
    priceUnit: formData.get("priceUnit") || undefined,
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
  revalidatePublicServices();
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
    basePrice: formData.get("basePrice") || undefined,
    priceUnit: formData.get("priceUnit") || undefined,
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
  revalidatePublicServices();
  return { success: true };
}

export async function toggleServiceActive(id: string, isActive: boolean) {
  await requireRole("ADMIN", "MANAGER");
  await db.service.update({ where: { id }, data: { isActive } });
  revalidatePath("/dashboard/services");
  revalidatePublicServices();
}

/**
 * Permanently deletes a service. Bookings, projects, quotation and invoice
 * lines that referenced it keep their records (the service link is nulled).
 * Returns (never throws) so a foreign-key block surfaces as a toast.
 */
export async function deleteService(id: string): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER");
  try {
    const childCount = await db.service.count({ where: { parentServiceId: id } });
    if (childCount > 0) {
      return { error: "This service has sub-services. Delete or move them first." };
    }

    await db.service.delete({ where: { id } });
    revalidatePath("/dashboard/services");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isForeignKey =
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") ||
      /foreign key|violates|constraint/i.test(message);
    if (isForeignKey) {
      return { error: "This service is linked to existing records and can't be deleted. Disable it instead." };
    }
    console.error("deleteService failed", error);
    return { error: "Couldn't delete this service. Disable it instead." };
  }
}

/** Inline price edit from the services table. Pass null to clear (On request). */
export async function updateServicePrice(
  id: string,
  basePrice: number | null,
  priceUnit: string | null,
): Promise<ActionState> {
  try {
    await requireRole("ADMIN", "MANAGER");
    if (basePrice !== null && (!Number.isFinite(basePrice) || basePrice < 0)) {
      return { error: "Enter a valid price (0 or more)." };
    }
    await db.service.update({
      where: { id },
      data: {
        basePrice: basePrice === null ? null : new Prisma.Decimal(basePrice),
        priceUnit: priceUnit || null,
      },
    });
    revalidatePath("/dashboard/services");
    return { success: true };
  } catch {
    return { error: "Couldn't update the price. Try again." };
  }
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

/** Uploads a new form/document and attaches it to the service in one step. */
export async function uploadServiceRequiredForm(
  serviceId: string,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireRole("ADMIN", "MANAGER");

  if (!isStorageConfigured) {
    return { error: "File storage isn't configured (set Cloudinary env vars)." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > 10 * 1024 * 1024) return { error: "File must be 10 MB or smaller." };

  const title = String(formData.get("title") ?? "").trim() || file.name;
  const category = formData.get("category") === "DOCUMENT" ? "DOCUMENT" : "FORM";

  try {
    const uploaded = await uploadFile(file, "company-documents");
    const doc = await db.companyDocument.create({
      data: {
        title,
        category,
        fileName: uploaded.fileName,
        url: uploaded.url,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        uploadedById: session.user.id,
      },
    });

    const maxOrder = await db.serviceRequiredForm.aggregate({
      where: { serviceId },
      _max: { order: true },
    });
    await db.serviceRequiredForm.create({
      data: { serviceId, companyDocumentId: doc.id, order: (maxOrder._max.order ?? -1) + 1 },
    });

    revalidatePath("/dashboard/services");
    revalidatePath("/dashboard/documents");
    return { success: true };
  } catch {
    return { error: "Upload failed. Try again." };
  }
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
