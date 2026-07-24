import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { BudgetsTable } from "./budgets-table";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  const session = await auth();
  if (session?.user.role === "STAFF") {
    return <AccessDenied message="Budgets are restricted to Admin, Manager, and Finance Officer roles." />;
  }
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "FINANCE_OFFICER";

  const [budgets, categories, branches] = await Promise.all([
    db.budget.findMany({
      orderBy: { periodStart: "desc" },
      include: { category: true, branch: true },
    }),
    db.expenseCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const budgetsWithSpending = await Promise.all(
    budgets.map(async (budget) => {
      const result = await db.expense.aggregate({
        where: {
          paymentStatus: { in: ["APPROVED", "PAID"] },
          expenseDate: { gte: budget.periodStart, lte: budget.periodEnd },
          ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
          ...(budget.branchId ? { branchId: budget.branchId } : {}),
        },
        _sum: { amount: true, taxAmount: true },
      });
      const actualSpending = Number(result._sum.amount ?? 0) + Number(result._sum.taxAmount ?? 0);

      return {
        id: budget.id,
        name: budget.name,
        categoryId: budget.categoryId,
        categoryName: budget.category?.name ?? null,
        branchId: budget.branchId,
        branchName: budget.branch?.name ?? null,
        period: budget.period,
        periodStart: budget.periodStart.toISOString(),
        periodEnd: budget.periodEnd.toISOString(),
        amount: Number(budget.amount),
        actualSpending,
        notes: budget.notes,
      };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Budgets</h1>
        <p className="text-sm text-muted-foreground">Plan spending limits and track progress against them.</p>
      </div>

      <BudgetsTable canManage={canManage} categories={categories} branches={branches} budgets={budgetsWithSpending} />
    </div>
  );
}
