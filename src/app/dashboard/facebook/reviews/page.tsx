import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isFacebookConfigured } from "@/lib/facebook";
import { FacebookReviews } from "../facebook-reviews";

export const metadata: Metadata = { title: "Facebook Reviews" };

export default async function FacebookReviewsPage() {
  const session = await auth();
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  const reviews = await db.facebookReview.findMany({
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reviews</h1>
        <p className="text-sm text-muted-foreground">Recommendations and reviews left on your Page.</p>
      </div>

      <FacebookReviews
        canManage={canManage}
        configured={isFacebookConfigured}
        reviews={reviews.map((review) => ({
          id: review.id,
          reviewerName: review.reviewerName,
          recommendationType: review.recommendationType,
          text: review.text,
          reviewedAt: review.reviewedAt ? review.reviewedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
