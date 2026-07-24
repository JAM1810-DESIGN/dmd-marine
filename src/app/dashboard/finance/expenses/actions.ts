"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppError } from "@/lib/errors";
import { isStorageConfigured, uploadFile } from "@/lib/storage";
import { expenseSchema } from "@/lib/validations/finance";

export type ActionState = { error?: string; success?: boolean };

const CREATE_ROLES = ["ADMIN", "FINANCE_OFFICER", "STAFF"] as const;
const MANAGE_ROLES = ["ADMIN", "FINANCE_OFFICER"] as const;
const APPROVE_ROLES = ["ADMIN", "MANAGER", "FINANCE_OFFICER"] as const;

async function nextExpenseNumber() {
  const year = new Date().getFullYear();
  const count = await db.expense.count({
    where: { expenseNumber: { startsWith: `EXP-${year}-` } },
  });
  return `EXP-${year}-${String(count + 1).padStart(4, "0")}`;
}

function parseExpenseForm(formData: FormData) {
  return expenseSchema.safeParse({
    expenseDate: formData.get("expenseDate"),
    categoryId: formData.get("categoryId"),
    vendorId: formData.get("vendorId") || undefined,
    description: formData.get("description"),
    projectId: formData.get("projectId") || undefined,
    bookingId: formData.get("bookingId") || undefined,
    branchId: formData.get("branchId") || undefined,
    amount: formData.get("amount"),
    taxAmount: formData.get("taxAmount") || 0,
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") || undefined,
  });
}

export async function createExpense(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(...CREATE_ROLES);

  const parsed = parseExpenseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { expenseDate, ...rest } = parsed.data;
  const expenseNumber = await nextExpenseNumber();

  await db.expense.create({
    data: {
      ...rest,
      expenseNumber,
      expenseDate: new Date(expenseDate),
      createdById: session.user.id,
    },
  });

  await db.notification.create({
    data: {
      type: "EXPENSE_PENDING_APPROVAL",
      title: "Expense pending approval",
      message: `${expenseNumber} (${rest.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}) is awaiting approval.`,
      link: "/dashboard/finance/expenses",
    },
  });

  revalidatePath("/dashboard/finance/expenses");
  return { success: true };
}

async function assertCanEdit(id: string, userId: string, role: string) {
  if (role === "ADMIN" || role === "FINANCE_OFFICER") return;

  const expense = await db.expense.findUniqueOrThrow({ where: { id } });
  if (expense.createdById !== userId || expense.paymentStatus !== "PENDING") {
    throw new AppError("FORBIDDEN", "You can only edit your own pending expenses.");
  }
}

export async function updateExpense(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(...CREATE_ROLES);
  await assertCanEdit(id, session.user.id, session.user.role);

  const parsed = parseExpenseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { expenseDate, ...rest } = parsed.data;

  await db.expense.update({
    where: { id },
    data: { ...rest, expenseDate: new Date(expenseDate) },
  });

  revalidatePath("/dashboard/finance/expenses");
  return { success: true };
}

export async function deleteExpense(id: string) {
  await requireRole(...MANAGE_ROLES);
  await db.expense.delete({ where: { id } });
  revalidatePath("/dashboard/finance/expenses");
}

export async function approveExpense(id: string) {
  const session = await requireRole(...APPROVE_ROLES);
  await db.expense.update({
    where: { id },
    data: { paymentStatus: "APPROVED", approvedById: session.user.id },
  });
  revalidatePath("/dashboard/finance/expenses");
}

export async function rejectExpense(id: string) {
  const session = await requireRole(...APPROVE_ROLES);
  await db.expense.update({
    where: { id },
    data: { paymentStatus: "REJECTED", approvedById: session.user.id },
  });
  revalidatePath("/dashboard/finance/expenses");
}

export async function markExpensePaid(id: string) {
  await requireRole(...MANAGE_ROLES);
  await db.expense.update({ where: { id }, data: { paymentStatus: "PAID" } });
  revalidatePath("/dashboard/finance/expenses");
}

export async function duplicateExpense(id: string) {
  const session = await requireRole(...CREATE_ROLES);
  const original = await db.expense.findUniqueOrThrow({ where: { id } });
  const expenseNumber = await nextExpenseNumber();

  await db.expense.create({
    data: {
      expenseNumber,
      expenseDate: new Date(),
      categoryId: original.categoryId,
      vendorId: original.vendorId,
      description: `${original.description} (copy)`,
      projectId: original.projectId,
      bookingId: original.bookingId,
      branchId: original.branchId,
      amount: original.amount,
      taxAmount: original.taxAmount,
      paymentMethod: original.paymentMethod,
      notes: original.notes,
      createdById: session.user.id,
    },
  });

  revalidatePath("/dashboard/finance/expenses");
}

export async function uploadExpenseReceipt(
  expenseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...CREATE_ROLES);

  if (!isStorageConfigured) {
    return { error: "File storage is not configured yet." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }

  const uploaded = await uploadFile(file, `expenses/${expenseId}`);
  await db.document.create({
    data: {
      fileName: uploaded.fileName,
      url: uploaded.url,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      category: "EXPENSE_RECEIPT",
      expenseId,
    },
  });

  revalidatePath("/dashboard/finance/expenses");
  return { success: true };
}
