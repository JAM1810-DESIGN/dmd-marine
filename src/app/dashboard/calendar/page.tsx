import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ScheduleCalendar } from "./schedule-calendar";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const session = await auth();
  const canManage =
    session?.user.role === "ADMIN" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "STAFF";

  // Bound the payload to a sensible window rather than all-time.
  const rangeStart = new Date();
  rangeStart.setMonth(rangeStart.getMonth() - 3);
  const rangeEnd = new Date();
  rangeEnd.setMonth(rangeEnd.getMonth() + 12);

  const [schedules, consultants] = await Promise.all([
    db.schedule.findMany({
      where: { startAt: { gte: rangeStart, lte: rangeEnd } },
      orderBy: { startAt: "asc" },
      include: {
        consultant: { select: { id: true, name: true } },
        booking: { select: { id: true, customerName: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Confirmed consultations, surveys, inspections, and training sessions.
        </p>
      </div>

      <ScheduleCalendar
        canManage={canManage}
        consultants={consultants}
        schedules={schedules.map((schedule) => ({
          id: schedule.id,
          title: schedule.title,
          type: schedule.type,
          startAt: schedule.startAt.toISOString(),
          endAt: schedule.endAt.toISOString(),
          consultantId: schedule.consultantId,
          consultantName: schedule.consultant.name,
          notes: schedule.notes,
          bookingId: schedule.booking?.id ?? null,
          bookingCustomer: schedule.booking?.customerName ?? null,
          projectId: schedule.project?.id ?? null,
          projectName: schedule.project?.name ?? null,
        }))}
      />
    </div>
  );
}
