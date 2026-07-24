import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { BranchesTable } from "./branches-table";
import { VendorsTable } from "./vendors-table";
import { ExpenseCategoriesTable } from "./expense-categories-table";

export const metadata: Metadata = { title: "Finance Settings" };

export default async function FinanceSettingsPage() {
  const session = await auth();
  if (session?.user.role === "STAFF") {
    return <AccessDenied message="Finance settings are restricted to Admin, Manager, and Finance Officer roles." />;
  }
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "FINANCE_OFFICER";

  const [branches, vendors, categories] = await Promise.all([
    db.branch.findMany({ orderBy: { name: "asc" } }),
    db.vendor.findMany({ orderBy: { name: "asc" } }),
    db.expenseCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Finance Settings</h1>
        <p className="text-sm text-muted-foreground">Branches, vendors, and expense categories.</p>
      </div>

      <BranchesTable canManage={canManage} branches={branches} />
      <VendorsTable canManage={canManage} vendors={vendors} />
      <ExpenseCategoriesTable canManage={canManage} categories={categories} />
    </div>
  );
}
