"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { sendEmail, type EmailAttachment } from "@/lib/mailer";
import { rateLimit } from "@/lib/rate-limit";
import { messageSchema } from "@/lib/validations/message";

export type ActionState = { error?: string; success?: boolean; warning?: string };

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB each

/** Pulls uploaded files off a FormData into email attachments (Buffers). Returns an error string if invalid. */
async function extractAttachments(
  formData: FormData,
): Promise<{ attachments: EmailAttachment[]; error?: string; names: string[] }> {
  const files = formData
    .getAll("attachments")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length > MAX_ATTACHMENTS) {
    return { attachments: [], names: [], error: `Attach at most ${MAX_ATTACHMENTS} files.` };
  }
  if (files.some((file) => file.size > MAX_ATTACHMENT_BYTES)) {
    return { attachments: [], names: [], error: "Each attachment must be 10 MB or smaller." };
  }

  const attachments: EmailAttachment[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    attachments.push({ filename: file.name, content: buffer, contentType: file.type || undefined });
  }
  return { attachments, names: files.map((f) => f.name) };
}

/** Staff reply to an external (website/email) conversation — saved and emailed to the submitter. */
export async function replyExternal(formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");

  const threadEmail = String(formData.get("threadEmail") ?? "").trim();
  const to = (String(formData.get("to") ?? "").trim() || threadEmail).trim();
  const cc = String(formData.get("cc") ?? "").trim();
  const externalName = (formData.get("externalName") as string) || null;
  const subject = String(formData.get("subject") ?? "").trim() || "Re: your message";
  const body = String(formData.get("body") ?? "");

  if (!threadEmail) return { error: "Missing conversation." };
  if (!body.trim()) return { error: "Write a message first." };

  const { attachments, error, names } = await extractAttachments(formData);
  if (error) return { error };

  const savedBody = names.length ? `${body}\n\n📎 ${names.join(", ")}` : body;

  await db.message.create({
    data: {
      channel: "EMAIL",
      subject,
      body: savedBody,
      externalEmail: threadEmail,
      externalName,
      fromUserId: session.user.id,
    },
  });

  const result = await sendEmail({ to, cc, subject, text: body, attachments });

  revalidatePath("/dashboard/messages");
  if (!result.sent) {
    return { success: true, warning: `Saved, but not emailed: ${result.error ?? "email unavailable"}` };
  }
  return { success: true };
}

/** Starts a brand-new external email conversation from the dashboard (From: DMD Marine). */
export async function composeExternalEmail(formData: FormData): Promise<ActionState> {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");

  const to = String(formData.get("to") ?? "").trim();
  const cc = String(formData.get("cc") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim() || "(no subject)";
  const body = String(formData.get("body") ?? "");

  if (!to) return { error: "Enter a recipient email." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: "Enter a valid recipient email." };
  if (!body.trim()) return { error: "Write a message first." };

  const { attachments, error, names } = await extractAttachments(formData);
  if (error) return { error };

  const savedBody = names.length ? `${body}\n\n📎 ${names.join(", ")}` : body;

  await db.message.create({
    data: {
      channel: "EMAIL",
      subject,
      body: savedBody,
      externalEmail: to,
      fromUserId: session.user.id,
    },
  });

  const result = await sendEmail({ to, cc, subject, text: body, attachments });

  // Sending a draft clears it from the Draft folder.
  const draftId = String(formData.get("draftId") ?? "").trim();
  if (draftId) await db.emailDraft.deleteMany({ where: { id: draftId, userId: session.user.id } });

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

/** Saves an unsent email as a draft (owned by the current user). */
export async function saveDraft(formData: FormData): Promise<ActionState & { id?: string }> {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
  const data = {
    to: String(formData.get("to") ?? "").trim() || null,
    cc: String(formData.get("cc") ?? "").trim() || null,
    subject: String(formData.get("subject") ?? "").trim() || null,
    body: String(formData.get("body") ?? "") || null,
  };
  if (!data.to && !data.subject && !data.body) return { error: "Nothing to save." };

  const draftId = String(formData.get("draftId") ?? "").trim();
  if (draftId) {
    await db.emailDraft.updateMany({ where: { id: draftId, userId: session.user.id }, data });
    revalidatePath("/dashboard/messages");
    return { success: true, id: draftId };
  }
  const draft = await db.emailDraft.create({ data: { ...data, userId: session.user.id } });
  revalidatePath("/dashboard/messages");
  return { success: true, id: draft.id };
}

export async function deleteDraft(id: string): Promise<ActionState> {
  const session = await requireRole("ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER");
  const result = await db.emailDraft.deleteMany({ where: { id, userId: session.user.id } });
  if (result.count === 0) return { error: "Draft not found." };
  revalidatePath("/dashboard/messages");
  return { success: true };
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

  const { allowed, retryAfterSeconds } = await rateLimit(`ai-draft:${session.user.id}`, 20, 60 * 1000);
  if (!allowed) {
    return { error: `Too many requests. Try again in ${retryAfterSeconds ?? 60}s.` };
  }

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
