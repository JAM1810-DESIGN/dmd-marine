"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export type ActionState = { error?: string; success?: boolean };

const ROLES = ["ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER"] as const;

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

function parse(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    company: formData.get("company") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(...ROLES);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  await db.contact.create({ data: parsed.data });
  revalidatePath("/dashboard/messages/contacts");
  return { success: true };
}

export async function updateContact(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(...ROLES);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const result = await db.contact.updateMany({ where: { id }, data: parsed.data });
  if (result.count === 0) return { error: "Contact not found." };
  revalidatePath("/dashboard/messages/contacts");
  return { success: true };
}

export async function deleteContact(id: string): Promise<ActionState> {
  await requireRole(...ROLES);
  const result = await db.contact.deleteMany({ where: { id } });
  if (result.count === 0) return { error: "Contact not found." };
  revalidatePath("/dashboard/messages/contacts");
  return { success: true };
}
