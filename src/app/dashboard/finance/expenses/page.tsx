import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage";
import { ExpensesTable } from "./expenses-table";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const session = await auth();
  const role = session?.user.role;
  const canCreate = role === "ADMIN" || role === "FINANCE_OFFICER" || role === "STAFF";
  const canApprove = role === "ADMIN" || role === "MANAGER" || role === "FINANCE_OFFICER";
  const canManage = role === "ADMIN" || role === "FINANCE_OFFICER";

  const [expenses, categories, vendors, projects, bookings, branches] = await Promise.all([
    db.expense.findMany({
      where: role === "STAFF" ? { createdById: session!.user.id } : undefined,
      orderBy: { expenseDate: "desc" },
      include: {
        category: true,
        vendor: true,
        branch: true,
        createdBy: true,
        documents: { where: { category: "EXPENSE_RECEIPT" } },
      },
    }),
    db.expenseCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.vendor.findMany({ orderBy: { name: "asc" } }),
    db.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, customerName: true } }),
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
        <p className="text-sm text-muted-foreground">
          {role === "STAFF" ? "Your submitted expenses." : "Track, approve, and pay business expenses."}
        </p>
      </div>

      <ExpensesTable
        canCreate={canCreate}
        canApprove={canApprove}
        canManage={canManage}
        storageConfigured={isStorageConfigured}
        categories={categories}
        vendors={vendors}
        projects={projects}
        bookings={bookings}
        branches={branches}
        expenses={expenses.map((expense) => ({
          id: expense.id,
          expenseNumber: expense.expenseNumber,
          expenseDate: expense.expenseDate.toISOString(),
          categoryId: expense.categoryId,
          categoryName: expense.category.name,
          vendorId: expense.vendorId,
          vendorName: expense.vendor?.name ?? null,
          description: expense.description,
          projectId: expense.projectId,
          bookingId: expense.bookingId,
          branchId: expense.branchId,
          branchName: expense.branch?.name ?? null,
          amount: Number(expense.amount),
          taxAmount: Number(expense.taxAmount),
          paymentMethod: expense.paymentMethod,
          paymentStatus: expense.paymentStatus,
          notes: expense.notes,
          createdById: expense.createdById,
          createdByName: expense.createdBy.name,
          receipts: expense.documents.map((doc) => ({ id: doc.id, fileName: doc.fileName, url: doc.url })),
        }))}
      />
    </div>
  );
}
