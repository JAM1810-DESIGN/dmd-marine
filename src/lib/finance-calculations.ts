import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type DateRange = { start: Date; end: Date };

function toNumber(value: Prisma.Decimal | null | undefined) {
  return value ? Number(value) : 0;
}

/** Revenue = total value of PAID invoices issued within the range. */
export async function getRevenueTotal(range: DateRange, branchId?: string) {
  const result = await db.invoice.aggregate({
    where: {
      status: "PAID",
      issueDate: { gte: range.start, lte: range.end },
      ...(branchId ? { branchId } : {}),
    },
    _sum: { totalAmount: true },
  });
  return toNumber(result._sum.totalAmount);
}

/** Approved or paid expenses only — pending/rejected expenses have no financial impact yet. */
export async function getExpenseTotal(range: DateRange, branchId?: string) {
  const result = await db.expense.aggregate({
    where: {
      paymentStatus: { in: ["APPROVED", "PAID"] },
      expenseDate: { gte: range.start, lte: range.end },
      ...(branchId ? { branchId } : {}),
    },
    _sum: { amount: true, taxAmount: true },
  });
  return toNumber(result._sum.amount) + toNumber(result._sum.taxAmount);
}

/** Expenses tied to a project/booking are treated as cost of service delivery; the rest is overhead. */
export async function getCostOfServiceTotal(range: DateRange, branchId?: string) {
  const result = await db.expense.aggregate({
    where: {
      paymentStatus: { in: ["APPROVED", "PAID"] },
      expenseDate: { gte: range.start, lte: range.end },
      OR: [{ projectId: { not: null } }, { bookingId: { not: null } }],
      ...(branchId ? { branchId } : {}),
    },
    _sum: { amount: true, taxAmount: true },
  });
  return toNumber(result._sum.amount) + toNumber(result._sum.taxAmount);
}

export async function getOutstandingInvoicesTotal(branchId?: string) {
  const invoices = await db.invoice.findMany({
    where: {
      status: { in: ["SENT", "PARTIAL", "OVERDUE"] },
      ...(branchId ? { branchId } : {}),
    },
    include: { payments: { where: { status: "COMPLETED" } } },
  });

  return invoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce((acc, p) => acc + toNumber(p.amount), 0);
    return sum + Math.max(toNumber(invoice.totalAmount) - paid, 0);
  }, 0);
}

export async function getPaidInvoicesTotal(range: DateRange, branchId?: string) {
  const result = await db.invoice.aggregate({
    where: {
      status: "PAID",
      issueDate: { gte: range.start, lte: range.end },
      ...(branchId ? { branchId } : {}),
    },
    _sum: { totalAmount: true },
    _count: true,
  });
  return { total: toNumber(result._sum.totalAmount), count: result._count };
}

export async function getCashFlow(range: DateRange) {
  const [paymentsIn, expensesOut] = await Promise.all([
    db.payment.aggregate({
      where: { status: "COMPLETED", paymentDate: { gte: range.start, lte: range.end } },
      _sum: { amount: true },
    }),
    db.expense.aggregate({
      where: { paymentStatus: "PAID", expenseDate: { gte: range.start, lte: range.end } },
      _sum: { amount: true, taxAmount: true },
    }),
  ]);

  const cashIn = toNumber(paymentsIn._sum.amount);
  const cashOut = toNumber(expensesOut._sum.amount) + toNumber(expensesOut._sum.taxAmount);
  return { cashIn, cashOut, net: cashIn - cashOut };
}

/** All-time cash position as of a date — a simple cash-basis balance, not a full ledger. */
export async function getCashPosition(asOf: Date) {
  const [paymentsIn, expensesOut] = await Promise.all([
    db.payment.aggregate({
      where: { status: "COMPLETED", paymentDate: { lte: asOf } },
      _sum: { amount: true },
    }),
    db.expense.aggregate({
      where: { paymentStatus: "PAID", expenseDate: { lte: asOf } },
      _sum: { amount: true, taxAmount: true },
    }),
  ]);

  return toNumber(paymentsIn._sum.amount) - toNumber(expensesOut._sum.amount) - toNumber(expensesOut._sum.taxAmount);
}

export async function getRevenueByService(range: DateRange) {
  const invoices = await db.invoice.findMany({
    where: { status: "PAID", issueDate: { gte: range.start, lte: range.end } },
    include: { items: { include: { service: true } } },
  });

  const totals = new Map<string, number>();
  for (const invoice of invoices) {
    for (const item of invoice.items) {
      const key = item.service?.name ?? "Other";
      totals.set(key, (totals.get(key) ?? 0) + toNumber(item.lineTotal));
    }
  }
  return Array.from(totals.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getRevenueByCustomer(range: DateRange) {
  const grouped = await db.invoice.groupBy({
    by: ["customerId"],
    where: { status: "PAID", issueDate: { gte: range.start, lte: range.end }, customerId: { not: null } },
    _sum: { totalAmount: true },
  });

  const customers = await db.customer.findMany({
    where: { id: { in: grouped.map((g) => g.customerId).filter((id): id is string => !!id) } },
  });
  const nameById = new Map(customers.map((c) => [c.id, c.name]));

  return grouped
    .map((g) => ({ name: nameById.get(g.customerId ?? "") ?? "Unknown", amount: toNumber(g._sum.totalAmount) }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getRevenueByBranch(range: DateRange) {
  const grouped = await db.invoice.groupBy({
    by: ["branchId"],
    where: { status: "PAID", issueDate: { gte: range.start, lte: range.end } },
    _sum: { totalAmount: true },
  });

  const branches = await db.branch.findMany({
    where: { id: { in: grouped.map((g) => g.branchId).filter((id): id is string => !!id) } },
  });
  const nameById = new Map(branches.map((b) => [b.id, b.name]));

  return grouped
    .map((g) => ({ name: g.branchId ? (nameById.get(g.branchId) ?? "Unknown") : "Unassigned", amount: toNumber(g._sum.totalAmount) }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getExpenseByVendor(range: DateRange) {
  const grouped = await db.expense.groupBy({
    by: ["vendorId"],
    where: { paymentStatus: { in: ["APPROVED", "PAID"] }, expenseDate: { gte: range.start, lte: range.end } },
    _sum: { amount: true, taxAmount: true },
  });

  const vendors = await db.vendor.findMany({
    where: { id: { in: grouped.map((g) => g.vendorId).filter((id): id is string => !!id) } },
  });
  const nameById = new Map(vendors.map((v) => [v.id, v.name]));

  return grouped
    .map((g) => ({
      name: g.vendorId ? (nameById.get(g.vendorId) ?? "Unknown") : "No vendor",
      amount: toNumber(g._sum.amount) + toNumber(g._sum.taxAmount),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getProjectProfitability(range: DateRange) {
  const [invoiceGroups, expenseGroups] = await Promise.all([
    db.invoice.groupBy({
      by: ["projectId"],
      where: { status: "PAID", issueDate: { gte: range.start, lte: range.end }, projectId: { not: null } },
      _sum: { totalAmount: true },
    }),
    db.expense.groupBy({
      by: ["projectId"],
      where: {
        paymentStatus: { in: ["APPROVED", "PAID"] },
        expenseDate: { gte: range.start, lte: range.end },
        projectId: { not: null },
      },
      _sum: { amount: true, taxAmount: true },
    }),
  ]);

  const projectIds = new Set([
    ...invoiceGroups.map((g) => g.projectId),
    ...expenseGroups.map((g) => g.projectId),
  ].filter((id): id is string => !!id));

  const projects = await db.project.findMany({ where: { id: { in: Array.from(projectIds) } } });
  const nameById = new Map(projects.map((p) => [p.id, p.name]));
  const revenueById = new Map(invoiceGroups.map((g) => [g.projectId, toNumber(g._sum.totalAmount)]));
  const expenseById = new Map(
    expenseGroups.map((g) => [g.projectId, toNumber(g._sum.amount) + toNumber(g._sum.taxAmount)]),
  );

  return Array.from(projectIds)
    .map((id) => {
      const revenue = revenueById.get(id) ?? 0;
      const expense = expenseById.get(id) ?? 0;
      return { name: nameById.get(id) ?? "Unknown", revenue, expense, profit: revenue - expense };
    })
    .sort((a, b) => b.profit - a.profit);
}

export async function getBookingProfitability(range: DateRange) {
  const [invoiceGroups, expenseGroups] = await Promise.all([
    db.invoice.groupBy({
      by: ["bookingId"],
      where: { status: "PAID", issueDate: { gte: range.start, lte: range.end }, bookingId: { not: null } },
      _sum: { totalAmount: true },
    }),
    db.expense.groupBy({
      by: ["bookingId"],
      where: {
        paymentStatus: { in: ["APPROVED", "PAID"] },
        expenseDate: { gte: range.start, lte: range.end },
        bookingId: { not: null },
      },
      _sum: { amount: true, taxAmount: true },
    }),
  ]);

  const bookingIds = new Set([
    ...invoiceGroups.map((g) => g.bookingId),
    ...expenseGroups.map((g) => g.bookingId),
  ].filter((id): id is string => !!id));

  const bookings = await db.booking.findMany({ where: { id: { in: Array.from(bookingIds) } } });
  const nameById = new Map(bookings.map((b) => [b.id, b.customerName]));
  const revenueById = new Map(invoiceGroups.map((g) => [g.bookingId, toNumber(g._sum.totalAmount)]));
  const expenseById = new Map(
    expenseGroups.map((g) => [g.bookingId, toNumber(g._sum.amount) + toNumber(g._sum.taxAmount)]),
  );

  return Array.from(bookingIds)
    .map((id) => {
      const revenue = revenueById.get(id) ?? 0;
      const expense = expenseById.get(id) ?? 0;
      return { name: nameById.get(id) ?? "Unknown", revenue, expense, profit: revenue - expense };
    })
    .sort((a, b) => b.profit - a.profit);
}

export async function getConsultantPerformance(range: DateRange) {
  const consultants = await db.user.findMany();

  const results = await Promise.all(
    consultants.map(async (consultant) => {
      const [projectCount, completedCount, revenue] = await Promise.all([
        db.project.count({ where: { consultantId: consultant.id } }),
        db.project.count({ where: { consultantId: consultant.id, status: "COMPLETED" } }),
        db.invoice.aggregate({
          where: {
            status: "PAID",
            issueDate: { gte: range.start, lte: range.end },
            project: { consultantId: consultant.id },
          },
          _sum: { totalAmount: true },
        }),
      ]);

      return {
        name: consultant.name,
        projectCount,
        completedCount,
        revenue: toNumber(revenue._sum.totalAmount),
      };
    }),
  );

  return results.filter((r) => r.projectCount > 0).sort((a, b) => b.revenue - a.revenue);
}

export async function getExpenseByCategory(range: DateRange) {
  const grouped = await db.expense.groupBy({
    by: ["categoryId"],
    where: {
      paymentStatus: { in: ["APPROVED", "PAID"] },
      expenseDate: { gte: range.start, lte: range.end },
    },
    _sum: { amount: true, taxAmount: true },
  });

  const categories = await db.expenseCategory.findMany({
    where: { id: { in: grouped.map((g) => g.categoryId) } },
  });
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  return grouped
    .map((g) => ({
      name: nameById.get(g.categoryId) ?? "Unknown",
      amount: toNumber(g._sum.amount) + toNumber(g._sum.taxAmount),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getMonthlySeries(monthsBack: number) {
  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    months.push({
      label: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      start,
      end,
    });
  }

  const series = await Promise.all(
    months.map(async (month) => ({
      label: month.label,
      revenue: await getRevenueTotal({ start: month.start, end: month.end }),
      expenses: await getExpenseTotal({ start: month.start, end: month.end }),
    })),
  );

  return series;
}

export async function getAnnualSeries(yearsBack: number) {
  const now = new Date();
  const years: { label: string; start: Date; end: Date }[] = [];

  for (let i = yearsBack - 1; i >= 0; i--) {
    const year = now.getFullYear() - i;
    years.push({
      label: String(year),
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31, 23, 59, 59),
    });
  }

  return Promise.all(
    years.map(async (year) => ({
      label: year.label,
      revenue: await getRevenueTotal({ start: year.start, end: year.end }),
      expenses: await getExpenseTotal({ start: year.start, end: year.end }),
    })),
  );
}
