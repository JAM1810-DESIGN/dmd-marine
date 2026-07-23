import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ScheduleCalendar } from "./schedule-calendar";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const schedules = await db.schedule.findMany({
    orderBy: { startAt: "asc" },
    include: { consultant: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Confirmed consultations, surveys, inspections, and training sessions.
        </p>
      </div>

      <ScheduleCalendar
        schedules={schedules.map((schedule) => ({
          id: schedule.id,
          title: schedule.title,
          type: schedule.type,
          startAt: schedule.startAt.toISOString(),
          endAt: schedule.endAt.toISOString(),
          consultantName: schedule.consultant.name,
        }))}
      />
    </div>
  );
}
