import { db } from "@/lib/db";

/** Lazily creates a reminder for schedule entries starting within 24h. Call on dashboard load. */
export async function refreshAppointmentReminders() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcoming = await db.schedule.findMany({
    where: { startAt: { gte: now, lte: in24h } },
  });
  if (upcoming.length === 0) return;

  const links = upcoming.map((s) => `/dashboard/calendar?scheduleId=${s.id}`);
  const existing = await db.notification.findMany({
    where: { type: "APPOINTMENT_REMINDER", link: { in: links } },
    select: { link: true },
  });
  const alreadyReminded = new Set(existing.map((n) => n.link));

  const toCreate = upcoming.filter((s) => !alreadyReminded.has(`/dashboard/calendar?scheduleId=${s.id}`));
  if (toCreate.length === 0) return;

  await db.notification.createMany({
    data: toCreate.map((s) => ({
      type: "APPOINTMENT_REMINDER" as const,
      title: "Upcoming appointment",
      message: `${s.title} starts ${s.startAt.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`,
      link: `/dashboard/calendar?scheduleId=${s.id}`,
    })),
  });
}
