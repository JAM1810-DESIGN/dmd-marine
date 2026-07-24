import { db } from "@/lib/db";

export type DateRange = { start: Date; end: Date };

/** Contact form + booking submissions, grouped by month — the "inquiries" volume trend. */
export async function getMonthlyInquiries(monthsBack: number) {
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

  return Promise.all(
    months.map(async (month) => {
      const [bookings, contactSubmissions] = await Promise.all([
        db.booking.count({ where: { createdAt: { gte: month.start, lte: month.end } } }),
        db.contactSubmission.count({ where: { createdAt: { gte: month.start, lte: month.end } } }),
      ]);
      return { label: month.label, bookings, contactSubmissions, total: bookings + contactSubmissions };
    }),
  );
}

/** Booking counts grouped by status, within a date range. */
export async function getBookingsByStatus(range: DateRange) {
  const statuses = ["NEW", "REVIEWING", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
  const counts = await Promise.all(
    statuses.map((status) =>
      db.booking.count({ where: { status, createdAt: { gte: range.start, lte: range.end } } }),
    ),
  );
  return statuses.map((status, i) => ({ name: status, count: counts[i] }));
}

/** Completed services (bookings marked COMPLETED) within a range, grouped by service. */
export async function getCompletedServices(range: DateRange) {
  const bookings = await db.booking.findMany({
    where: { status: "COMPLETED", updatedAt: { gte: range.start, lte: range.end } },
    include: { service: true },
  });

  const byService = new Map<string, number>();
  for (const booking of bookings) {
    byService.set(booking.service.name, (byService.get(booking.service.name) ?? 0) + 1);
  }

  return Array.from(byService.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Where leads originate: public booking form, public contact form, or Facebook. */
export async function getLeadSources(range: DateRange) {
  const [bookings, contactSubmissions, facebookLeads] = await Promise.all([
    db.booking.count({ where: { createdAt: { gte: range.start, lte: range.end } } }),
    db.contactSubmission.count({ where: { createdAt: { gte: range.start, lte: range.end } } }),
    db.facebookLead.count({ where: { createdAt: { gte: range.start, lte: range.end } } }),
  ]);

  return [
    { name: "Booking Form", count: bookings },
    { name: "Contact Form", count: contactSubmissions },
    { name: "Facebook", count: facebookLeads },
  ];
}

/** New customer records created per month — growth of the CRM customer base. */
export async function getCustomerGrowth(monthsBack: number) {
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

  const startingCount = await db.customer.count({ where: { createdAt: { lt: months[0].start } } });

  const newCustomersByMonth = await Promise.all(
    months.map((month) =>
      db.customer.count({ where: { createdAt: { gte: month.start, lte: month.end } } }),
    ),
  );

  let cumulative = startingCount;
  return months.map((month, i) => {
    cumulative += newCustomersByMonth[i];
    return { label: month.label, newCustomers: newCustomersByMonth[i], totalCustomers: cumulative };
  });
}

/** Most-requested services by booking volume within a range. */
export async function getPopularServices(range: DateRange) {
  const bookings = await db.booking.findMany({
    where: { createdAt: { gte: range.start, lte: range.end } },
    include: { service: true },
  });

  const byService = new Map<string, number>();
  for (const booking of bookings) {
    byService.set(booking.service.name, (byService.get(booking.service.name) ?? 0) + 1);
  }

  return Array.from(byService.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
