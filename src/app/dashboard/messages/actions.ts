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

export async function markAllRead(): Promise<ActionState> {
  try {
    const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    await db.message.updateMany({
      where: { toUserId: session.user.id, isRead: false, channel: "INTERNAL" },
      data: { isRead: true },
    });
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't update your inbox. Try again." };
  }
}

/** Deletes a message the current user sent or received. */
export async function deleteMessage(id: string): Promise<ActionState> {
  try {
    const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    const result = await db.message.deleteMany({
      where: { id, OR: [{ toUserId: session.user.id }, { fromUserId: session.user.id }] },
    });
    if (result.count === 0) return { error: "Message not found." };
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't delete the message. Try again." };
  }
}

export type DraftState = { draft?: string; error?: string };

/** Drafts a reply to a received message using Claude. Reads ANTHROPIC_API_KEY. */
export async function draftReply(messageId: string, instruction?: string): Promise<DraftState> {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "AI is not configured. Add ANTHROPIC_API_KEY to your .env to enable draft replies." };
  }

  const message = await db.message.findFirst({
    where: { id: messageId, toUserId: session.user.id },
    include: { fromUser: { select: { name: true } } },
  });
  if (!message) return { error: "Message not found." };

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system:
        "You draft concise, professional internal replies for staff at DMD Marine, a marine consultancy. " +
        "Write only the reply body — no subject line, no greeting placeholder brackets, no sign-off name. " +
        "Keep it brief and to the point. Match a colleague-to-colleague tone.",
      messages: [
        {
          role: "user",
          content:
            `Draft a reply to this internal message.\n\n` +
            `From: ${message.fromUser?.name ?? "A colleague"}\n` +
            `Subject: ${message.subject ?? "(no subject)"}\n` +
            `Message:\n${message.body}\n\n` +
            (instruction ? `The reply should: ${instruction}\n\n` : "") +
            `Write the reply body now.`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return { error: "The assistant declined to draft this reply." };
    }

    const draft = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    if (!draft) return { error: "The assistant returned an empty draft." };
    return { draft };
  } catch {
    return { error: "Couldn't reach the AI service. Check the API key and try again." };
  }
}
