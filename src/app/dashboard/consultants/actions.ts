"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { createConsultantSchema, updateConsultantSchema } from "@/lib/validations/consultant";

export type ActionState = { error?: string; success?: boolean };

export async function createConsultant(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("ADMIN");

  const parsed = createConsultantSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    rank: formData.get("rank") || undefined,
    vesselExperience: formData.get("vesselExperience") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    baseLocations: formData.getAll("baseLocations").map(String),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  try {
    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return { error: "A user with this email already exists." };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "STAFF",
        rank: parsed.data.rank,
        vesselExperience: parsed.data.vesselExperience,
        phone: parsed.data.phone,
        address: parsed.data.address,
        baseLocations: parsed.data.baseLocations,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "CONSULTANT_CREATED",
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email },
    });

    revalidatePath("/dashboard/consultants");
    return { success: true };
  } catch {
    return { error: "Couldn't save the consultant. Try again." };
  }
}

export async function updateConsultant(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("ADMIN");

  const parsed = updateConsultantSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    rank: formData.get("rank") || undefined,
    vesselExperience: formData.get("vesselExperience") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    baseLocations: formData.getAll("baseLocations").map(String),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  try {
    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing && existing.id !== id) {
      return { error: "A user with this email already exists." };
    }

    const before = await db.user.findUniqueOrThrow({ where: { id } });

    await db.user.update({ where: { id }, data: parsed.data });

    await logAudit({
      userId: session.user.id,
      action: "CONSULTANT_UPDATED",
      entityType: "User",
      entityId: id,
      metadata: { emailBefore: before.email, emailAfter: parsed.data.email },
    });

    revalidatePath("/dashboard/consultants");
    return { success: true };
  } catch {
    return { error: "Couldn't save the consultant. Try again." };
  }
}

export async function deactivateConsultant(id: string): Promise<void> {
  const session = await requireRole("ADMIN");
  if (id === session.user.id) {
    throw new AppError("BAD_REQUEST", "You can't deactivate your own account.");
  }

  await db.user.update({ where: { id }, data: { isActive: false } });

  await logAudit({
    userId: session.user.id,
    action: "CONSULTANT_DEACTIVATED",
    entityType: "User",
    entityId: id,
  });

  revalidatePath("/dashboard/consultants");
}

export async function reactivateConsultant(id: string): Promise<void> {
  const session = await requireRole("ADMIN");

  await db.user.update({ where: { id }, data: { isActive: true } });

  await logAudit({
    userId: session.user.id,
    action: "CONSULTANT_REACTIVATED",
    entityType: "User",
    entityId: id,
  });

  revalidatePath("/dashboard/consultants");
}
