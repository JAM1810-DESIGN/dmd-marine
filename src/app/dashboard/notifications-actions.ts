"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export async function markNotificationRead(id: string) {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
  // Only mark a notification the user can actually see (their own or a broadcast).
  await db.notification.updateMany({
    where: { id, OR: [{ userId: null }, { userId: session.user.id }] },
    data: { isRead: true },
  });
  revalidatePath("/dashboard", "layout");
}

export async function markAllNotificationsRead() {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
  await db.notification.updateMany({
    where: { isRead: false, OR: [{ userId: null }, { userId: session.user.id }] },
    data: { isRead: true },
  });
  revalidatePath("/dashboard", "layout");
}
