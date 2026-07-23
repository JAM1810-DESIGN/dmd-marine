"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { messageSchema } from "@/lib/validations/message";

export type ActionState = { error?: string; success?: boolean };

export async function sendMessage(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");

  const parsed = messageSchema.safeParse({
    toUserId: formData.get("toUserId"),
    subject: formData.get("subject") || undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await db.message.create({
    data: {
      ...parsed.data,
      channel: "INTERNAL",
      fromUserId: session.user.id,
    },
  });

  revalidatePath("/dashboard/messages");
  return { success: true };
}

export async function markMessageRead(id: string) {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
  await db.message.updateMany({
    where: { id, toUserId: session.user.id },
    data: { isRead: true },
  });
  revalidatePath("/dashboard/messages");
}
