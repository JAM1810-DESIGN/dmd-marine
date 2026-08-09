"use client";

import { useTransition } from "react";
import { RefreshCw, EyeOff, Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { notify } from "@/lib/notify";
import { syncFacebookComments, toggleFacebookCommentHidden } from "./actions";

export type CommentRow = {
  id: string;
  fromName: string | null;
  message: string | null;
  isHidden: boolean;
  commentedAt: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
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
          const result = await syncFacebookComments();
          if (result.error) notify.error(result.error);
          else notify.success(`Synced ${result.count ?? 0} comment${result.count === 1 ? "" : "s"}`);
        })
      }
    >
      <RefreshCw className="size-4" />
      {isPending ? "Syncing..." : "Sync"}
    </Button>
  );
}

function HideButton({ comment, canManage }: { comment: CommentRow; canManage: boolean }) {
  const [isPending, start] = useTransition();
  if (!canManage) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() =>
        start(async () => {
          const result = await toggleFacebookCommentHidden(comment.id, !comment.isHidden);
          if (result.error) notify.error(result.error);
          else notify.success(comment.isHidden ? "Comment shown" : "Comment hidden");
        })
      }
    >
      {comment.isHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      {comment.isHidden ? "Unhide" : "Hide"}
    </Button>
  );
}

export function FacebookComments({
  comments,
  canManage,
  configured,
}: {
  comments: CommentRow[];
  canManage: boolean;
  configured: boolean;
}) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="font-heading text-base font-semibold">Comments</h2>
          <p className="text-sm text-muted-foreground">Comments on your Page&rsquo;s posts.</p>
        </div>
        {canManage && configured && <SyncButton />}
      </div>

      {comments.length === 0 ? (
        <EmptyState
          className="border-none"
          icon={MessageCircle}
          title={configured ? "No comments yet" : "Connect your Page to see comments"}
          description={
            configured
              ? "Click Sync to pull the latest comments from your Page posts."
              : "Connect the Page from the Connection tab, then Sync."
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {comments.map((comment) => (
            <li key={comment.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{comment.fromName ?? "Unknown"}</span>
                  {comment.isHidden && <Badge variant="outline">Hidden</Badge>}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
                  {comment.message ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(comment.commentedAt)}</p>
              </div>
              <HideButton comment={comment} canManage={canManage} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
