"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export type ActionState = { error?: string; success?: boolean };

const ROLES = ["ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER"] as const;

const identitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  greeting: z.string().optional(),
  signOff: z.string().optional(),
  signatureName: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

function parse(formData: FormData) {
  return identitySchema.safeParse({
    name: formData.get("name"),
    greeting: formData.get("greeting") || undefined,
    signOff: formData.get("signOff") || undefined,
    signatureName: formData.get("signatureName") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "true",
  });
}

/** Ensures only one identity is flagged default. */
async function clearOtherDefaults(exceptId?: string) {
  await db.messageIdentity.updateMany({
    where: { isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
    data: { isDefault: false },
  });
}

export async function createIdentity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(...ROLES);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const { email, ...rest } = parsed.data;
  const created = await db.messageIdentity.create({
    data: { ...rest, email: email || null },
  });
  if (created.isDefault) await clearOtherDefaults(created.id);
  revalidatePath("/dashboard/messages/settings");
  return { success: true };
}

export async function updateIdentity(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(...ROLES);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const { email, ...rest } = parsed.data;
  const result = await db.messageIdentity.updateMany({
    where: { id },
    data: { ...rest, email: email || null },
  });
  if (result.count === 0) return { error: "Identity not found." };
  if (parsed.data.isDefault) await clearOtherDefaults(id);
  revalidatePath("/dashboard/messages/settings");
  return { success: true };
}

export async function deleteIdentity(id: string): Promise<ActionState> {
  await requireRole(...ROLES);
  const result = await db.messageIdentity.deleteMany({ where: { id } });
  if (result.count === 0) return { error: "Identity not found." };
  revalidatePath("/dashboard/messages/settings");
  return { success: true };
}

export async function setDefaultIdentity(id: string): Promise<ActionState> {
  await requireRole(...ROLES);
  await clearOtherDefaults(id);
  const result = await db.messageIdentity.updateMany({ where: { id }, data: { isDefault: true } });
  if (result.count === 0) return { error: "Identity not found." };
  revalidatePath("/dashboard/messages/settings");
  return { success: true };
}
