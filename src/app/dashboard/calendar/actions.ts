"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { scheduleSchema } from "@/lib/validations/schedule";

export type ActionState = { error?: string; success?: boolean };

const SCHEDULE_ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;

function parseSchedule(formData: FormData) {
  return scheduleSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    consultantId: formData.get("consultantId"),
    notes: formData.get("notes") || undefined,
  });
}

export async function createScheduleForBooking(
  bookingId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...SCHEDULE_ROLES);

  const parsed = parseSchedule(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { startAt, endAt, ...rest } = parsed.data;

  await db.$transaction([
    db.schedule.create({
      data: { ...rest, bookingId, startAt: new Date(startAt), endAt: new Date(endAt) },
    }),
    db.booking.update({
      where: { id: bookingId },
      data: { status: "SCHEDULED", assignedConsultantId: parsed.data.consultantId },
    }),
  ]);

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/bookings");
  return { success: true };
}

export async function createScheduleForProject(
  projectId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(...SCHEDULE_ROLES);

  const parsed = parseSchedule(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { startAt, endAt, ...rest } = parsed.data;

  await db.schedule.create({
    data: { ...rest, projectId, startAt: new Date(startAt), endAt: new Date(endAt) },
  });

  revalidatePath("/dashboard/calendar");
  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}
