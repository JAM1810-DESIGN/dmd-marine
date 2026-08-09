"use client";

import { useTransition } from "react";
import { RefreshCw, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { notify } from "@/lib/notify";
import { syncFacebookReviews } from "./actions";

export type ReviewRow = {
  id: string;
  reviewerName: string | null;
  recommendationType: string | null;
  text: string | null;
  reviewedAt: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function SyncButton() {
  const [isPending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        start(async () => {
          const result = await syncFacebookReviews();
          if (result.error) notify.error(result.error);
          else notify.success(`Synced ${result.count ?? 0} review${result.count === 1 ? "" : "s"}`);
        })
      }
    >
      <RefreshCw className="size-4" />
      {isPending ? "Syncing..." : "Sync"}
    </Button>
  );
}

function Recommendation({ type }: { type: string | null }) {
  const positive = (type ?? "").toLowerCase() === "positive";
  const negative = (type ?? "").toLowerCase() === "negative";
  if (positive) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-success">
        <ThumbsUp className="size-4" /> Recommends
      </span>
    );
  }
  if (negative) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-destructive">
        <ThumbsDown className="size-4" /> Doesn&rsquo;t recommend
      </span>
    );
  }
  return <Badge variant="outline">{type ?? "Review"}</Badge>;
}

export function FacebookReviews({
  reviews,
  canManage,
  configured,
}: {
  reviews: ReviewRow[];
  canManage: boolean;
  configured: boolean;
}) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="font-heading text-base font-semibold">Reviews</h2>
          <p className="text-sm text-muted-foreground">Recommendations left on your Page.</p>
        </div>
        {canManage && configured && <SyncButton />}
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          className="border-none"
          icon={Star}
          title={configured ? "No reviews yet" : "Connect your Page to see reviews"}
          description={
            configured
              ? "Click Sync to pull the latest recommendations from your Page."
              : "Connect the Page from the Connection tab, then Sync."
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">{review.reviewerName ?? "Anonymous"}</span>
                <Recommendation type={review.recommendationType} />
              </div>
              {review.text && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{review.text}</p>
              )}
              <p className="text-xs text-muted-foreground">{formatDate(review.reviewedAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
