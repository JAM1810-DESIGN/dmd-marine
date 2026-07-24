"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { branchSchema, vendorSchema, expenseCategorySchema } from "@/lib/validations/finance";

export type ActionState = { error?: string; success?: boolean };

const FINANCE_MANAGE_ROLES = ["ADMIN", "FINANCE_OFFICER"] as const;

function emptyToUndefined(value: FormDataEntryValue | null) {
  return value && value !== "" ? String(value) : undefined;
}

// ── Branches ─────────────────────────────────────────────────────────────────

export async function createBranch(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...FINANCE_MANAGE_ROLES);
  const parsed = branchSchema.safeParse({
    name: formData.get("name"),
    address: emptyToUndefined(formData.get("address")),
    phone: emptyToUndefined(formData.get("phone")),
    email: formData.get("email") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  await db.branch.create({ data: parsed.data });
  revalidatePath("/dashboard/finance/settings");
  return { success: true };
}

export async function updateBranch(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...FINANCE_MANAGE_ROLES);
  const parsed = branchSchema.safeParse({
    name: formData.get("name"),
    address: emptyToUndefined(formData.get("address")),
    phone: emptyToUndefined(formData.get("phone")),
    email: formData.get("email") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  await db.branch.update({ where: { id }, data: parsed.data });
  revalidatePath("/dashboard/finance/settings");
  return { success: true };
}

export async function toggleBranchActive(id: string, isActive: boolean) {
  await requireRole(...FINANCE_MANAGE_ROLES);
  await db.branch.update({ where: { id }, data: { isActive } });
  revalidatePath("/dashboard/finance/settings");
}

// ── Vendors ──────────────────────────────────────────────────────────────────

export async function createVendor(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...FINANCE_MANAGE_ROLES);
  const parsed = vendorSchema.safeParse({
    name: formData.get("name"),
    contactName: emptyToUndefined(formData.get("contactName")),
    email: formData.get("email") || "",
    phone: emptyToUndefined(formData.get("phone")),
    address: emptyToUndefined(formData.get("address")),
    notes: emptyToUndefined(formData.get("notes")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  await db.vendor.create({ data: parsed.data });
  revalidatePath("/dashboard/finance/settings");
  return { success: true };
}

export async function updateVendor(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...FINANCE_MANAGE_ROLES);
  const parsed = vendorSchema.safeParse({
    name: formData.get("name"),
    contactName: emptyToUndefined(formData.get("contactName")),
    email: formData.get("email") || "",
    phone: emptyToUndefined(formData.get("phone")),
    address: emptyToUndefined(formData.get("address")),
    notes: emptyToUndefined(formData.get("notes")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  await db.vendor.update({ where: { id }, data: parsed.data });
  revalidatePath("/dashboard/finance/settings");
  return { success: true };
}

// ── Expense categories ───────────────────────────────────────────────────────

export async function createExpenseCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...FINANCE_MANAGE_ROLES);
  const parsed = expenseCategorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const existing = await db.expenseCategory.findUnique({ where: { name: parsed.data.name } });
  if (existing) return { error: "A category with this name already exists." };

  await db.expenseCategory.create({ data: { name: parsed.data.name, isDefault: false } });
  revalidatePath("/dashboard/finance/settings");
  return { success: true };
}

export async function toggleExpenseCategoryActive(id: string, isActive: boolean) {
  await requireRole(...FINANCE_MANAGE_ROLES);
  await db.expenseCategory.update({ where: { id }, data: { isActive } });
  revalidatePath("/dashboard/finance/settings");
}
