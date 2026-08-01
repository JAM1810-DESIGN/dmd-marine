"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { siteSettingsSchema, createUserSchema } from "@/lib/validations/settings";
import type { Role } from "@/generated/prisma/enums";

export type ActionState = { error?: string; success?: boolean };

export async function updateSiteSettings(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN");

  const parsed = siteSettingsSchema.safeParse({
    companyName: formData.get("companyName"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    country: formData.get("country") || undefined,
    facebookUrl: formData.get("facebookUrl") || undefined,
    linkedinUrl: formData.get("linkedinUrl") || undefined,
    instagramUrl: formData.get("instagramUrl") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await db.siteSettings.upsert({
    where: { id: "default" },
    update: parsed.data,
    create: { id: "default", ...parsed.data },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/");
  revalidatePath("/contact");
  return { success: true };
}

export async function createUser(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("ADMIN");

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "A user with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateUserRole(id: string, role: Role) {
  const session = await requireRole("ADMIN");
  if (id === session.user.id) {
    throw new AppError("BAD_REQUEST", "You can't change your own role.");
  }
  const before = await db.user.findUniqueOrThrow({ where: { id } });
  await db.user.update({ where: { id }, data: { role } });

  await logAudit({
    userId: session.user.id,
    action: "USER_ROLE_CHANGED",
    entityType: "User",
    entityId: id,
    metadata: { from: before.role, to: role },
  });

  revalidatePath("/dashboard/settings");
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const session = await requireRole("ADMIN");
  if (id === session.user.id) {
    throw new AppError("BAD_REQUEST", "You can't deactivate your own account.");
  }
  await db.user.update({ where: { id }, data: { isActive } });

  await logAudit({
    userId: session.user.id,
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: id,
  });

  revalidatePath("/dashboard/settings");
}
