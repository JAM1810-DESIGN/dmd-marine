import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { BookingCalendar } from "./booking-calendar";
import { BookingsTable } from "./bookings-table";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage() {
  const session = await auth();
  const canManage =
    session?.user.role === "ADMIN" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "STAFF";

  const [bookings, consultants] = await Promise.all([
    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: { service: true },
    }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const calendarBookings = bookings
    .filter((booking) => booking.preferredDate)
    .map((booking) => ({
      id: booking.id,
      customerName: booking.customerName,
      serviceName: booking.service.name,
      status: booking.status,
      preferredDate: booking.preferredDate!.toISOString(),
      preferredTime: booking.preferredTime,
    }));

  const tableBookings = bookings.map((booking) => ({
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
      <BookingsTable bookings={tableBookings} consultants={consultants} canManage={canManage} />
    </div>
  );
}
