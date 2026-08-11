"use client";

import { useTransition } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { CurrencyAmount } from "@/components/shared/currency-amount";
import { deleteBudget } from "./actions";
import { BudgetFormDialog } from "./budget-form-dialog";

export type BudgetRow = {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  branchId: string | null;
  branchName: string | null;
  period: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  actualSpending: number;
  notes: string | null;
};

export function BudgetsTable({
  budgets,
  categories,
  branches,
  canManage,
}: {
  budgets: BudgetRow[];
  categories: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border-t-[3px] border-t-violet-500 bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="font-heading text-base font-semibold">Budgets</h2>
          <p className="text-sm text-muted-foreground">Track actual spending against planned budgets.</p>
        </div>
        {canManage && (
          <BudgetFormDialog
            categories={categories}
            branches={branches}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                New Budget
              </Button>
            }
          />
        )}
      </div>

      {budgets.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No budgets yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {budgets.map((budget) => {
            const percent = budget.amount > 0 ? (budget.actualSpending / budget.amount) * 100 : 0;
            const overLimit = percent > 100;
            const remaining = budget.amount - budget.actualSpending;

            return (
              <li key={budget.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{budget.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {budget.categoryName ?? "All categories"} · {budget.branchName ?? "All branches"} ·{" "}
                      {budget.period.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {overLimit && (
                      <Badge variant="destructive">
                        <AlertTriangle className="size-3" />
                        Over Budget
                      </Badge>
                    )}
                    {canManage && (
                      <>
                        <BudgetFormDialog
                          budget={budget}
                          categories={categories}
                          branches={branches}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Edit budget">
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete budget"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await deleteBudget(budget.id);
                              notify.success("Budget deleted");
                            })
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <Progress value={Math.min(percent, 100)} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    <CurrencyAmount amountPhp={budget.actualSpending} /> of <CurrencyAmount amountPhp={budget.amount} /> ({percent.toFixed(0)}%)
                  </span>
                  <span>
                    {remaining >= 0 ? (
                      <><CurrencyAmount amountPhp={remaining} /> remaining</>
                    ) : (
                      <><CurrencyAmount amountPhp={-remaining} /> over</>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
