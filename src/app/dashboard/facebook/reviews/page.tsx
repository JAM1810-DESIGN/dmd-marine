import type { Metadata } from "next";
import { Star } from "lucide-react";
import { isFacebookConfigured } from "@/lib/facebook";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Facebook Reviews" };

export default function FacebookReviewsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reviews</h1>
        <p className="text-sm text-muted-foreground">Recommendations and reviews left on your Page.</p>
      </div>

      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <EmptyState
          className="border-none"
          icon={Star}
          title={isFacebookConfigured ? "No reviews yet" : "Connect your Page to see reviews"}
          description={
            isFacebookConfigured
              ? "Reviews and recommendations from your Page will appear here."
              : "Connect the Page from the Connection tab, then review sync will populate this view."
          }
        />
      </div>
    </div>
  );
}
