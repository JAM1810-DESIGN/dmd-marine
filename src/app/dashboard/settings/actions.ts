"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { siteSettingsSchema, createUserSchema, changePasswordSchema } from "@/lib/validations/settings";
import type { Role } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

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

export async function changeOwnPassword(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  try {
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return { error: "Your account could not be found." };
    }

    const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return { error: "Your current password is incorrect." };
    }

    if (parsed.data.newPassword === parsed.data.currentPassword) {
      return { error: "New password must be different from the current one." };
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });

    try {
      await logAudit({
        userId: user.id,
        action: "USER_PASSWORD_CHANGED",
        entityType: "User",
        entityId: user.id,
      });
    } catch (error) {
      console.error("changeOwnPassword: audit failed", error);
    }

    return { success: true };
  } catch (error) {
    console.error("changeOwnPassword failed", error);
    return { error: "Couldn't change your password right now. Please try again." };
  }
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

// Returns (not throws) its outcome: Next masks thrown Server Action errors in
// production, so a thrown message would never reach the client. The caller
// surfaces `error` in a toast.
export async function deleteUser(id: string): Promise<ActionState> {
  const session = await requireRole("ADMIN");
  if (id === session.user.id) {
    return { error: "You can't delete your own account." };
  }

  // The whole body is guarded: any thrown error (FK restrict from the pg
  // adapter, a failed audit write, anything) is turned into a returned message.
  // Next masks thrown Server Action errors AND trips the page error boundary
  // ("Something went wrong"), so this action must never throw.
  try {
    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return { error: "That account no longer exists." };
    }

    // Never let the last admin be removed — it would lock everyone out.
    if (target.role === "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return { error: "You can't delete the last admin account." };
      }
    }

    try {
      await db.user.delete({ where: { id } });
    } catch (error) {
      // Required relations (Projects, Expenses, Schedules the user owns) block a
      // hard delete. The pg adapter surfaces this as P2003 or as a raw driver
      // error whose message mentions the constraint — treat both as "blocked".
      const message = error instanceof Error ? error.message : String(error);
      const isForeignKey =
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") ||
        /foreign key|violates|constraint/i.test(message);
      if (isForeignKey) {
        return {
          error: "This account owns projects, expenses, or schedules and can't be deleted. Deactivate it instead.",
        };
      }
      console.error("deleteUser: delete failed", error);
      return { error: "Couldn't delete this account. Deactivate it instead." };
    }

    // Best-effort — the account is already gone, so a failure here must not
    // crash the page or report the delete as failed.
    try {
      await logAudit({
        userId: session.user.id,
        action: "USER_DELETED",
        entityType: "User",
        entityId: id,
        metadata: { email: target.email, role: target.role },
      });
      revalidatePath("/dashboard/settings");
    } catch (error) {
      console.error("deleteUser: post-delete step failed", error);
    }

    return { success: true };
  } catch (error) {
    console.error("deleteUser failed", error);
    return { error: "Couldn't delete this account right now. Please try again." };
  }
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
