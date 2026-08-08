import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { BookingCalendar } from "./booking-calendar";
import { BookingsTable } from "./bookings-table";
import {
  PAGE_SIZE,
  parseBookingListParams,
  buildBookingWhere,
  buildBookingOrderBy,
} from "./query";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const canManage =
    session?.user.role === "ADMIN" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "STAFF";
  const canManageFinance = session?.user.role === "ADMIN" || session?.user.role === "FINANCE_OFFICER";

  const params = parseBookingListParams(await searchParams);
  const where = buildBookingWhere(params);

  const [total, pageBookings, calendarSource, boardSource, consultants] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      orderBy: buildBookingOrderBy(params),
      include: { service: { select: { name: true } } },
      skip: (params.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    // Calendar shows every dated booking, independent of table paging/filters.
    db.booking.findMany({
      where: { preferredDate: { not: null } },
      select: {
        id: true,
        customerName: true,
        status: true,
        preferredDate: true,
        preferredTime: true,
        service: { select: { name: true } },
      },
    }),
    // Board shows every booking grouped by status, independent of table paging.
    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        customerName: true,
        companyName: true,
        vesselName: true,
        port: true,
        status: true,
        preferredDate: true,
        preferredTime: true,
        assignedConsultantId: true,
        service: { select: { name: true } },
        assignedConsultant: { select: { name: true } },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const calendarBookings = calendarSource.map((booking) => ({
    id: booking.id,
    customerName: booking.customerName,
    serviceName: booking.service.name,
    status: booking.status,
    preferredDate: booking.preferredDate!.toISOString(),
    preferredTime: booking.preferredTime,
  }));

  const boardBookings = boardSource.map((booking) => ({
    id: booking.id,
    serviceName: booking.service.name,
    customerName: booking.customerName,
    companyName: booking.companyName,
    vesselName: booking.vesselName,
    port: booking.port,
    status: booking.status,
    preferredDate: booking.preferredDate ? booking.preferredDate.toISOString() : null,
    preferredTime: booking.preferredTime,
    assignedConsultantId: booking.assignedConsultantId,
    consultantName: booking.assignedConsultant?.name ?? null,
  }));

  const tableBookings = pageBookings.map((booking) => ({
    id: booking.id,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    companyName: booking.companyName,
    vesselName: booking.vesselName,
    serviceName: booking.service.name,
    status: booking.status,
    assignedConsultantId: booking.assignedConsultantId,
    customerId: booking.customerId,
    preferredDate: booking.preferredDate ? booking.preferredDate.toISOString() : null,
    preferredTime: booking.preferredTime,
    createdAt: booking.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          Review incoming requests, manage scheduling, and track status.
        </p>
      </div>

      <BookingCalendar bookings={calendarBookings} />
      <BookingsTable
        bookings={tableBookings}
        boardBookings={boardBookings}
        consultants={consultants}
        canManage={canManage}
        canManageFinance={canManageFinance}
        total={total}
        pageSize={PAGE_SIZE}
        params={params}
      />
    </div>
  );
}
