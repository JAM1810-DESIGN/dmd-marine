import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isFacebookConfigured } from "@/lib/facebook";
import { FacebookComments } from "../facebook-comments";

export const metadata: Metadata = { title: "Facebook Comments" };

export default async function FacebookCommentsPage() {
  const session = await auth();
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  const comments = await db.facebookComment.findMany({
    orderBy: [{ commentedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Comments</h1>
        <p className="text-sm text-muted-foreground">Moderate comments on your Page&rsquo;s posts.</p>
      </div>

      <FacebookComments
        canManage={canManage}
        configured={isFacebookConfigured}
        comments={comments.map((comment) => ({
          id: comment.id,
          fromName: comment.fromName,
          message: comment.message,
          isHidden: comment.isHidden,
          commentedAt: comment.commentedAt ? comment.commentedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
