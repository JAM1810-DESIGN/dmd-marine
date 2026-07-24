"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import type { FinancialStatementType } from "@/generated/prisma/enums";

export async function saveStatementSnapshot(
  type: FinancialStatementType,
  periodStart: string,
  periodEnd: string,
  data: unknown,
) {
  const session = await requireRole("ADMIN", "FINANCE_OFFICER");

  await db.financialStatement.create({
    data: {
      type,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      data: data as object,
      generatedById: session.user.id,
    },
  });

  revalidatePath("/dashboard/finance/statements");
}
