import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toErrorResponse } from "@/lib/errors";
import {
  verifyWebhookHandshake,
  verifyWebhookSignature,
  fetchLeadgenData,
  fetchMessengerProfile,
  isFacebookConfigured,
} from "@/lib/facebook";

/** Meta's one-time verification handshake when you register this URL as the webhook callback. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (verifyWebhookHandshake(mode, token) && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

type MessagingEvent = {
  sender?: { id?: string };
  message?: { text?: string; is_echo?: boolean };
};

type LeadgenChangeValue = {
  leadgen_id?: string;
  page_id?: string;
};

async function notifyFacebookEvent(title: string, message: string) {
  await db.notification.create({
    data: { type: "FACEBOOK_MESSAGE", title, message, link: "/dashboard/facebook" },
  });
}

async function handleMessengerEvent(pageId: string, event: MessagingEvent) {
  const psid = event.sender?.id;
  const text = event.message?.text;
  if (!psid || !text || event.message?.is_echo) return;

  let lead = await db.facebookLead.findUnique({ where: { psid } });
  if (!lead) {
    const profile = isFacebookConfigured ? await fetchMessengerProfile(psid) : {};
    lead = await db.facebookLead.create({
      data: { pageId, psid, name: profile.name },
    });
  }

  await db.message.create({
    data: { channel: "FACEBOOK", body: text, facebookLeadId: lead.id, isRead: false },
  });

  await notifyFacebookEvent(
    "New Facebook message",
    `${lead.name ?? "Someone"} sent a message via Messenger`,
  );
}

async function handleLeadgenChange(pageId: string, value: LeadgenChangeValue) {
  const leadgenId = value.leadgen_id;
  if (!leadgenId) return;

  const existing = await db.facebookLead.findUnique({ where: { leadgenId } });
  if (existing) return;

  const data = isFacebookConfigured ? await fetchLeadgenData(leadgenId) : undefined;

  const lead = await db.facebookLead.create({
    data: {
      pageId,
      leadgenId,
      name: data?.name,
      email: data?.email,
      phone: data?.phone,
      rawPayload: data?.raw ?? value,
    },
  });

  await notifyFacebookEvent(
    "New Facebook lead",
    `${lead.name ?? "A new lead"} submitted an inquiry via Facebook`,
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    if (!verifyWebhookSignature(rawBody, signature)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    for (const entry of payload.entry ?? []) {
      const pageId: string = entry.id ?? "unknown";

      for (const event of entry.messaging ?? []) {
        await handleMessengerEvent(pageId, event);
      }

      for (const change of entry.changes ?? []) {
        if (change.field === "leadgen") {
          await handleLeadgenChange(pageId, change.value ?? {});
        }
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
