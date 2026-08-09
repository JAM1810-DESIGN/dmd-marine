"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import {
  isFacebookConfigured,
  sendMessengerReply,
  fetchPageComments,
  fetchPageReviews,
  setCommentHidden,
} from "@/lib/facebook";
import type { FacebookLeadStatus } from "@/generated/prisma/enums";

export type ActionState = { error?: string; success?: boolean; warning?: string };
export type SyncState = { count?: number; error?: string };

const FACEBOOK_ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;

function toDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function syncFacebookComments(): Promise<SyncState> {
  await requireRole("ADMIN", "MANAGER");
  if (!isFacebookConfigured) return { error: "Connect the Page first (see the Connection tab)." };

  try {
    const comments = await fetchPageComments();
    for (const comment of comments) {
      await db.facebookComment.upsert({
        where: { commentId: comment.id },
        create: {
          commentId: comment.id,
          postId: comment.postId,
          fromName: comment.fromName,
          fromId: comment.fromId,
          message: comment.message,
          commentedAt: toDate(comment.createdTime),
          rawPayload: comment.raw as object,
        },
        update: {
          message: comment.message,
          rawPayload: comment.raw as object,
        },
      });
    }
    revalidatePath("/dashboard/facebook/comments");
    revalidatePath("/dashboard/facebook");
    return { count: comments.length };
  } catch {
    return { error: "Couldn't sync comments. Check the Page token permissions." };
  }
}

export async function syncFacebookReviews(): Promise<SyncState> {
  await requireRole("ADMIN", "MANAGER");
  if (!isFacebookConfigured) return { error: "Connect the Page first (see the Connection tab)." };

  try {
    const reviews = await fetchPageReviews();
    for (const review of reviews) {
      await db.facebookReview.upsert({
        where: { reviewKey: review.key },
        create: {
          reviewKey: review.key,
          reviewerName: review.reviewerName,
          recommendationType: review.recommendationType,
          text: review.text,
          reviewedAt: toDate(review.createdTime),
          rawPayload: review.raw as object,
        },
        update: {
          recommendationType: review.recommendationType,
          text: review.text,
          rawPayload: review.raw as object,
        },
      });
    }
    revalidatePath("/dashboard/facebook/reviews");
    revalidatePath("/dashboard/facebook");
    return { count: reviews.length };
  } catch {
    return { error: "Couldn't sync reviews. Check the Page token permissions." };
  }
}

export async function toggleFacebookCommentHidden(id: string, hidden: boolean): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER");
  if (!isFacebookConfigured) return { error: "Connect the Page first." };

  try {
    const comment = await db.facebookComment.findUniqueOrThrow({ where: { id } });
    await setCommentHidden(comment.commentId, hidden);
    await db.facebookComment.update({ where: { id }, data: { isHidden: hidden } });
    revalidatePath("/dashboard/facebook/comments");
    return { success: true };
  } catch {
    return { error: "Couldn't update the comment on Facebook. Try again." };
  }
}

export async function replyToLead(
  leadId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(...FACEBOOK_ROLES);

  const text = String(formData.get("body") ?? "").trim();
  if (!text) {
    return { error: "Message can't be empty." };
  }

  const lead = await db.facebookLead.findUniqueOrThrow({ where: { id: leadId } });

  await db.message.create({
    data: {
      channel: "FACEBOOK",
      body: text,
      facebookLeadId: leadId,
      fromUserId: session.user.id,
      isRead: true,
    },
  });

  await db.message.updateMany({
    where: { facebookLeadId: leadId, fromUserId: null, isRead: false },
    data: { isRead: true },
  });

  let warning: string | undefined;
  if (isFacebookConfigured && lead.psid) {
    try {
      await sendMessengerReply(lead.psid, text);
    } catch {
      warning = "Saved, but delivery to Facebook failed.";
    }
  } else if (!isFacebookConfigured) {
    warning = "Saved locally — Facebook isn't connected yet, so it wasn't actually sent.";
  }

  revalidatePath("/dashboard/facebook");
  return { success: true, warning };
}

export async function markLeadRead(leadId: string) {
  await requireRole(...FACEBOOK_ROLES);
  await db.message.updateMany({
    where: { facebookLeadId: leadId, fromUserId: null, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/dashboard/facebook");
}

export async function updateLeadStatus(leadId: string, status: FacebookLeadStatus) {
  await requireRole(...FACEBOOK_ROLES);
  await db.facebookLead.update({ where: { id: leadId }, data: { status } });
  revalidatePath("/dashboard/facebook");
}

export async function addFacebookLeadToCrm(leadId: string) {
  await requireRole(...FACEBOOK_ROLES);

  const lead = await db.facebookLead.findUniqueOrThrow({ where: { id: leadId } });
  if (lead.customerId) return { customerId: lead.customerId };

  const customer = await db.customer.create({
    data: {
      name: lead.name ?? "Facebook Lead",
      email: lead.email,
      phone: lead.phone,
    },
  });

  await db.facebookLead.update({ where: { id: leadId }, data: { customerId: customer.id } });

  revalidatePath("/dashboard/facebook");
  revalidatePath("/dashboard/customers");
  return { customerId: customer.id };
}
