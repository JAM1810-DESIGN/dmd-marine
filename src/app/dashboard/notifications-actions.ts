"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function markNotificationRead(id: string) {
  await db.notification.update({ where: { id }, data: { isRead: true } });
  revalidatePath("/dashboard", "layout");
}

export async function markAllNotificationsRead() {
  await db.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  revalidatePath("/dashboard", "layout");
}
