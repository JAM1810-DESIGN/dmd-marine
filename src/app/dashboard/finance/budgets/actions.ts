"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { budgetSchema } from "@/lib/validations/finance";

export type ActionState = { error?: string; success?: boolean };

const MANAGE_ROLES = ["ADMIN", "FINANCE_OFFICER"] as const;

function parseBudgetForm(formData: FormData) {
  return budgetSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId") || undefined,
    branchId: formData.get("branchId") || undefined,
    period: formData.get("period"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    amount: formData.get("amount"),
    notes: formData.get("notes") || undefined,
  });
}

export async function createBudget(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);
  const parsed = parseBudgetForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { periodStart, periodEnd, ...rest } = parsed.data;
  await db.budget.create({
    data: { ...rest, periodStart: new Date(periodStart), periodEnd: new Date(periodEnd) },
  });

  revalidatePath("/dashboard/finance/budgets");
  return { success: true };
}

export async function updateBudget(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...MANAGE_ROLES);
  const parsed = parseBudgetForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { periodStart, periodEnd, ...rest } = parsed.data;
  await db.budget.update({
    where: { id },
    data: { ...rest, periodStart: new Date(periodStart), periodEnd: new Date(periodEnd) },
  });

  revalidatePath("/dashboard/finance/budgets");
  return { success: true };
}

export async function deleteBudget(id: string) {
  await requireRole(...MANAGE_ROLES);
  await db.budget.delete({ where: { id } });
  revalidatePath("/dashboard/finance/budgets");
}
