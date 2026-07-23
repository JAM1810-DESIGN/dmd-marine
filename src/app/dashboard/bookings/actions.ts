"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import type { BookingStatus } from "@/generated/prisma/enums";

export async function updateBookingStatus(id: string, status: BookingStatus) {
  await requireRole("ADMIN", "MANAGER", "STAFF");
  await db.booking.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/bookings");
}

export async function assignConsultant(id: string, consultantId: string | null) {
  await requireRole("ADMIN", "MANAGER", "STAFF");
  await db.booking.update({ where: { id }, data: { assignedConsultantId: consultantId } });
  revalidatePath("/dashboard/bookings");
}
