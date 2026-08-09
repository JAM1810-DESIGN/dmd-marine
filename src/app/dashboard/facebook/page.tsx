import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, CalendarPlus, Star, MessageCircle, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { isFacebookConfigured } from "@/lib/facebook";
import { ConnectionBanner } from "./connection-banner";

export const metadata: Metadata = { title: "Facebook" };

export default async function FacebookOverviewPage() {
  const pageName = env.NEXT_PUBLIC_APP_NAME;

  const [unreadMessages, pendingRequests, reviews, comments] = await Promise.all([
    db.message.count({ where: { facebookLeadId: { not: null }, isRead: false } }),
    db.facebookLead.count({ where: { status: "NEW" } }),
    db.facebookReview.count(),
    db.facebookComment.count({ where: { isHidden: false } }),
  ]);

  const cards = [
    { label: "Unread messages", value: unreadMessages, href: "/dashboard/facebook/inbox", cta: "Open inbox", icon: MessageSquare },
    { label: "Pending requests", value: pendingRequests, href: "/dashboard/facebook/requests", cta: "Review", icon: CalendarPlus },
    { label: "Reviews", value: reviews, href: "/dashboard/facebook/reviews", cta: "View", icon: Star },
    { label: "Comments", value: comments, href: "/dashboard/facebook/comments", cta: "Moderate", icon: MessageCircle },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Facebook overview</h1>
          <span className="text-sm font-medium text-accent">{pageName}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Messenger, comments, reviews, and booking requests from {pageName}&rsquo;s Page.
        </p>
      </div>

      <ConnectionBanner configured={isFacebookConfigured} pageName={pageName} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <card.icon className="size-4" />
              {card.label}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{card.value}</p>
            <Link
              href={card.href}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              {card.cta}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
