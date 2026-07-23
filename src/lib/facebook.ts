import crypto from "node:crypto";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const appSecret = process.env.FACEBOOK_APP_SECRET;
const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const webhookVerifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;

/** False until FACEBOOK_* env vars are set — callers should hide live actions until then. */
export const isFacebookConfigured = Boolean(appSecret && pageAccessToken && webhookVerifyToken);

/** Which of the required env vars are present, for a read-only status display — never the values themselves. */
export const facebookConfigStatus = {
  appSecret: Boolean(appSecret),
  pageAccessToken: Boolean(pageAccessToken),
  webhookVerifyToken: Boolean(webhookVerifyToken),
};

/** Verifies the GET webhook handshake Meta sends when you register the callback URL. */
export function verifyWebhookHandshake(mode: string | null, token: string | null) {
  return Boolean(webhookVerifyToken) && mode === "subscribe" && token === webhookVerifyToken;
}

/** Verifies the X-Hub-Signature-256 header against the raw request body using the App Secret. */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export async function sendMessengerReply(psid: string, text: string) {
  if (!isFacebookConfigured) {
    throw new Error("Facebook is not configured yet.");
  }

  const response = await fetch(`${GRAPH_BASE}/me/messages?access_token=${pageAccessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: psid }, message: { text } }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Facebook send failed: ${response.status} ${body}`);
  }
}

export type LeadgenFieldData = {
  name?: string;
  email?: string;
  phone?: string;
  raw: unknown;
};

function pickField(fieldData: { name: string; values: string[] }[], keys: string[]) {
  for (const key of keys) {
    const match = fieldData.find((field) => field.name.toLowerCase() === key);
    if (match?.values?.[0]) return match.values[0];
  }
  return undefined;
}

export async function fetchLeadgenData(leadgenId: string): Promise<LeadgenFieldData> {
  if (!isFacebookConfigured) {
    throw new Error("Facebook is not configured yet.");
  }

  const response = await fetch(`${GRAPH_BASE}/${leadgenId}?access_token=${pageAccessToken}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch lead data: ${response.status}`);
  }

  const raw = await response.json();
  const fieldData: { name: string; values: string[] }[] = raw.field_data ?? [];

  return {
    name: pickField(fieldData, ["full_name", "name"]),
    email: pickField(fieldData, ["email"]),
    phone: pickField(fieldData, ["phone_number", "phone"]),
    raw,
  };
}

export async function fetchMessengerProfile(psid: string): Promise<{ name?: string }> {
  if (!isFacebookConfigured) return {};

  const response = await fetch(
    `${GRAPH_BASE}/${psid}?fields=first_name,last_name&access_token=${pageAccessToken}`,
  );
  if (!response.ok) return {};

  const data = await response.json();
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ");
  return { name: name || undefined };
}
