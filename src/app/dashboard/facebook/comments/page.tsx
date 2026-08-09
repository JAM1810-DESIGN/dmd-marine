import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { isFacebookConfigured } from "@/lib/facebook";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Facebook Comments" };

export default function FacebookCommentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Comments</h1>
        <p className="text-sm text-muted-foreground">Moderate comments on your Page&rsquo;s posts.</p>
      </div>

      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <EmptyState
          className="border-none"
          icon={MessageCircle}
          title={isFacebookConfigured ? "No comments yet" : "Connect your Page to see comments"}
          description={
            isFacebookConfigured
              ? "New comments on your Page posts will appear here for moderation."
              : "Connect the Page from the Connection tab, then comment sync will populate this view."
          }
        />
      </div>
    </div>
  );
}
