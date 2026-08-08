"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { uploadFile, isStorageConfigured } from "@/lib/storage";
import { companyDocumentSchema } from "@/lib/validations/company-document";

export type ActionState = { error?: string; success?: boolean };

export async function createCompanyDocument(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("ADMIN", "MANAGER");

  if (!isStorageConfigured) {
    return { error: "File storage is not configured yet." };
  }

  const parsed = companyDocumentSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }

  const uploaded = await uploadFile(file, "company-documents");

  await db.companyDocument.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      expiresAt: parsed.data.expiresAt,
      fileName: uploaded.fileName,
      url: uploaded.url,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      uploadedById: session.user.id,
    },
  });

  revalidatePath("/dashboard/documents");
  return { success: true };
}

export async function updateCompanyDocument(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER");

  const parsed = companyDocumentSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const file = formData.get("file");
  const hasNewFile = file instanceof File && file.size > 0;

  if (hasNewFile && !isStorageConfigured) {
    return { error: "File storage is not configured yet." };
  }

  const uploaded = hasNewFile ? await uploadFile(file, "company-documents") : null;

  await db.companyDocument.update({
    where: { id },
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      expiresAt: parsed.data.expiresAt,
      ...(uploaded
        ? {
            fileName: uploaded.fileName,
            url: uploaded.url,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
          }
        : {}),
    },
  });

  revalidatePath("/dashboard/documents");
  return { success: true };
}

export async function deleteCompanyDocument(id: string): Promise<void> {
  await requireRole("ADMIN", "MANAGER");
  await db.companyDocument.delete({ where: { id } });
  revalidatePath("/dashboard/documents");
}
