"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { sendEmail } from "@/lib/mailer";
import { messageSchema } from "@/lib/validations/message";

export type ActionState = { error?: string; success?: boolean; warning?: string };

type ExternalReplyInput = {
  threadEmail: string; // groups the reply into the existing conversation
  to?: string; // actual recipient (defaults to threadEmail)
  cc?: string;
  externalName: string | null;
  subject: string;
  body: string;
};

/** Staff reply to an external (website/email) conversation — saved and emailed to the submitter. */
export async function replyExternal(input: ExternalReplyInput): Promise<ActionState> {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
  if (!input.body.trim()) return { error: "Write a message first." };
  const to = (input.to || input.threadEmail).trim();
  const subject = input.subject.trim() || "Re: your message";

  await db.message.create({
    data: {
      channel: "EMAIL",
      subject,
      body: input.body,
      externalEmail: input.threadEmail,
      externalName: input.externalName,
      fromUserId: session.user.id,
    },
  });

  const result = await sendEmail({ to, cc: input.cc, subject, text: input.body });

  revalidatePath("/dashboard/messages");
  if (!result.sent) {
    return { success: true, warning: `Saved, but not emailed: ${result.error ?? "email unavailable"}` };
  }
  return { success: true };
}

/** Starts a brand-new external email conversation from the dashboard (From: DMD Marine). */
export async function composeExternalEmail(input: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
}): Promise<ActionState> {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
  const to = input.to.trim();
  if (!to) return { error: "Enter a recipient email." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: "Enter a valid recipient email." };
  if (!input.body.trim()) return { error: "Write a message first." };
  const subject = input.subject.trim() || "(no subject)";

  await db.message.create({
    data: {
      channel: "EMAIL",
      subject,
      body: input.body,
      externalEmail: to,
      fromUserId: session.user.id,
    },
  });

  const result = await sendEmail({ to, cc: input.cc, subject, text: input.body });

  revalidatePath("/dashboard/messages");
  if (!result.sent) {
    return { success: true, warning: `Saved, but not emailed: ${result.error ?? "email unavailable"}` };
  }
  return { success: true };
}

/** Marks every inbound message from an external email as read. */
export async function markExternalThreadRead(externalEmail: string): Promise<ActionState> {
  try {
    await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    await db.message.updateMany({
      where: { channel: "EMAIL", externalEmail, fromUserId: null, isRead: false },
      data: { isRead: true },
    });
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't update the conversation. Try again." };
  }
}

/** Confirms an external consultation request into a real Booking (from its stored payload). */
export async function confirmExternalBooking(messageId: string): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER", "STAFF");

  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) return { error: "Request not found." };
  if (message.bookingId) return { error: "Already confirmed into a booking." };

  const payload = (message.payload ?? {}) as Record<string, unknown>;
  if (payload.kind !== "booking" || typeof payload.serviceId !== "string") {
    return { error: "This conversation isn't a booking request." };
  }

  try {
    const booking = await db.booking.create({
      data: {
        serviceId: payload.serviceId,
        customerName: (payload.customerName as string) ?? message.externalName ?? "Website request",
        customerEmail: (payload.customerEmail as string) ?? message.externalEmail ?? "",
        customerPhone: (payload.customerPhone as string) ?? null,
        companyName: (payload.companyName as string) ?? null,
        vesselName: (payload.vesselName as string) ?? null,
        port: (payload.port as string) ?? null,
        preferredDate: payload.preferredDate ? new Date(payload.preferredDate as string) : undefined,
        preferredTime: (payload.preferredTime as string) ?? null,
        message: (payload.message as string) ?? null,
      },
    });

    await db.message.update({ where: { id: messageId }, data: { bookingId: booking.id } });
    await db.notification.create({
      data: {
        type: "NEW_BOOKING",
        title: "Request confirmed as booking",
        message: `${booking.customerName} — ${booking.customerEmail}`,
        link: "/dashboard/bookings",
      },
    });

    revalidatePath("/dashboard/messages");
    revalidatePath("/dashboard/bookings");
    return { success: true };
  } catch {
    return { error: "Couldn't create the booking. Try again." };
  }
}

/** Creates a booking straight from an external conversation that has no stored request payload. */
export async function createBookingFromThread(
  externalEmail: string,
  externalName: string | null,
): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER", "STAFF");

  // Don't double-book: bail if any message in this thread already made a booking.
  const existing = await db.message.findFirst({
    where: { channel: "EMAIL", externalEmail, bookingId: { not: null } },
    select: { bookingId: true },
  });
  if (existing) return { error: "This conversation already has a booking." };

  const service = await db.service.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!service) return { error: "No service exists yet. Add a service before booking." };

  try {
    const booking = await db.booking.create({
      data: {
        serviceId: service.id,
        customerName: externalName ?? externalEmail,
        customerEmail: externalEmail,
      },
    });

    const latest = await db.message.findFirst({
      where: { channel: "EMAIL", externalEmail },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latest) {
      await db.message.update({ where: { id: latest.id }, data: { bookingId: booking.id } });
    }

    await db.notification.create({
      data: {
        type: "NEW_BOOKING",
        title: "Booking created from message",
        message: `${booking.customerName} — ${booking.customerEmail}`,
        link: "/dashboard/bookings",
      },
    });

    revalidatePath("/dashboard/messages");
    revalidatePath("/dashboard/bookings");
    return { success: true };
  } catch {
    return { error: "Couldn't create the booking. Try again." };
  }
}

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

/** Marks every message received from a counterpart as read. */
export async function markThreadRead(counterpartId: string): Promise<ActionState> {
  try {
    const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    await db.message.updateMany({
      where: {
        channel: "INTERNAL",
        toUserId: session.user.id,
        fromUserId: counterpartId,
        isRead: false,
      },
      data: { isRead: true },
    });
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't update the conversation. Try again." };
  }
}

/** Archives (hides) an entire conversation with a counterpart. */
export async function archiveConversation(counterpartId: string): Promise<ActionState> {
  try {
    const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    await db.message.updateMany({
      where: {
        channel: "INTERNAL",
        archivedAt: null,
        OR: [
          { toUserId: session.user.id, fromUserId: counterpartId },
          { fromUserId: session.user.id, toUserId: counterpartId },
        ],
      },
      data: { archivedAt: new Date() },
    });
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't archive the conversation. Try again." };
  }
}

export async function unarchiveConversation(counterpartId: string): Promise<ActionState> {
  try {
    const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    await db.message.updateMany({
      where: {
        channel: "INTERNAL",
        archivedAt: { not: null },
        OR: [
          { toUserId: session.user.id, fromUserId: counterpartId },
          { fromUserId: session.user.id, toUserId: counterpartId },
        ],
      },
      data: { archivedAt: null },
    });
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't restore the conversation. Try again." };
  }
}

/** Stars or unstars an entire internal conversation with a counterpart. */
export async function toggleStarInternal(counterpartId: string, starred: boolean): Promise<ActionState> {
  try {
    const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    await db.message.updateMany({
      where: {
        channel: "INTERNAL",
        OR: [
          { toUserId: session.user.id, fromUserId: counterpartId },
          { fromUserId: session.user.id, toUserId: counterpartId },
        ],
      },
      data: { starredAt: starred ? new Date() : null },
    });
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't update the conversation. Try again." };
  }
}

/** Stars or unstars an entire external (website/email) conversation. */
export async function toggleStarExternal(externalEmail: string, starred: boolean): Promise<ActionState> {
  try {
    await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    await db.message.updateMany({
      where: { channel: "EMAIL", externalEmail },
      data: { starredAt: starred ? new Date() : null },
    });
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't update the conversation. Try again." };
  }
}

/** Archives an external (website/email) conversation. */
export async function archiveExternal(externalEmail: string): Promise<ActionState> {
  try {
    await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    await db.message.updateMany({
      where: { channel: "EMAIL", externalEmail, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't archive the conversation. Try again." };
  }
}

/** Restores an archived external conversation. */
export async function unarchiveExternal(externalEmail: string): Promise<ActionState> {
  try {
    await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    await db.message.updateMany({
      where: { channel: "EMAIL", externalEmail, archivedAt: { not: null } },
      data: { archivedAt: null },
    });
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't restore the conversation. Try again." };
  }
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

/** Archives (hides) a message the current user sent or received. */
export async function archiveMessage(id: string): Promise<ActionState> {
  try {
    const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    const result = await db.message.updateMany({
      where: { id, OR: [{ toUserId: session.user.id }, { fromUserId: session.user.id }] },
      data: { archivedAt: new Date() },
    });
    if (result.count === 0) return { error: "Message not found." };
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't archive the message. Try again." };
  }
}

export async function unarchiveMessage(id: string): Promise<ActionState> {
  try {
    const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
    const result = await db.message.updateMany({
      where: { id, OR: [{ toUserId: session.user.id }, { fromUserId: session.user.id }] },
      data: { archivedAt: null },
    });
    if (result.count === 0) return { error: "Message not found." };
    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch {
    return { error: "Couldn't restore the message. Try again." };
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
