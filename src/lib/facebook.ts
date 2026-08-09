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

export type RawComment = {
  id: string;
  postId?: string;
  fromName?: string;
  fromId?: string;
  message?: string;
  createdTime?: string;
  raw: unknown;
};

/** Fetches recent comments across the Page's posts (page token → `me` is the Page). */
export async function fetchPageComments(): Promise<RawComment[]> {
  if (!isFacebookConfigured) throw new Error("Facebook is not configured yet.");

  const url = `${GRAPH_BASE}/me/feed?fields=id,comments.limit(50){id,from,message,created_time}&limit=25&access_token=${pageAccessToken}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch comments: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const posts: { id: string; comments?: { data?: RawGraphComment[] } }[] = data.data ?? [];
  const out: RawComment[] = [];
  for (const post of posts) {
    for (const comment of post.comments?.data ?? []) {
      out.push({
        id: comment.id,
        postId: post.id,
        fromName: comment.from?.name,
        fromId: comment.from?.id,
        message: comment.message,
        createdTime: comment.created_time,
        raw: comment,
      });
    }
  }
  return out;
}

type RawGraphComment = {
  id: string;
  from?: { name?: string; id?: string };
  message?: string;
  created_time?: string;
};

export type RawReview = {
  key: string;
  reviewerName?: string;
  recommendationType?: string;
  text?: string;
  createdTime?: string;
  raw: unknown;
};

/** Fetches Page ratings/recommendations. */
export async function fetchPageReviews(): Promise<RawReview[]> {
  if (!isFacebookConfigured) throw new Error("Facebook is not configured yet.");

  const url = `${GRAPH_BASE}/me/ratings?fields=reviewer{name,id},recommendation_type,review_text,created_time,open_graph_story{id}&limit=50&access_token=${pageAccessToken}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch reviews: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const ratings: RawGraphRating[] = data.data ?? [];
  return ratings.map((rating) => ({
    key: rating.open_graph_story?.id ?? `${rating.reviewer?.id ?? "anon"}_${rating.created_time ?? ""}`,
    reviewerName: rating.reviewer?.name,
    recommendationType: rating.recommendation_type,
    text: rating.review_text,
    createdTime: rating.created_time,
    raw: rating,
  }));
}

type RawGraphRating = {
  reviewer?: { name?: string; id?: string };
  recommendation_type?: string;
  review_text?: string;
  created_time?: string;
  open_graph_story?: { id?: string };
};

/** Hides or unhides a Page comment via the Graph API. */
export async function setCommentHidden(commentId: string, hidden: boolean) {
  if (!isFacebookConfigured) throw new Error("Facebook is not configured yet.");

  const response = await fetch(`${GRAPH_BASE}/${commentId}?access_token=${pageAccessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_hidden: hidden }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update comment: ${response.status} ${await response.text()}`);
  }
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
