"use client";

import { useTransition } from "react";
import { FilePenLine, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { notify } from "@/lib/notify";
import { ComposeDialog, type ComposeProps } from "./compose-dialog";
import { deleteDraft } from "./actions";

export type DraftRow = {
  id: string;
  to: string | null;
  cc: string | null;
  subject: string | null;
  body: string | null;
  updatedAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function DraftsPanel({ drafts, compose }: { drafts: DraftRow[]; compose: ComposeProps }) {
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteDraft(id);
      if (result.error) notify.error(result.error);
      else notify.success("Draft deleted");
    });
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="border-b border-border px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-medium capitalize text-foreground">
          <FilePenLine className="size-3.5 text-muted-foreground" />
          Draft
        </span>
      </div>

      {drafts.length === 0 ? (
        <EmptyState
          className="border-none"
          icon={FilePenLine}
          title="No drafts"
          description="Saved-but-unsent emails show up here."
        />
      ) : (
        <ul className="divide-y divide-border">
          {drafts.map((draft) => (
            <li key={draft.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/40">
              <span className="w-32 shrink-0 truncate text-sm text-foreground/90 sm:w-48">
                {draft.to || "(no recipient)"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="text-foreground/90">{draft.subject || "(no subject)"}</span>
                {draft.body && <span className="text-muted-foreground"> — {draft.body}</span>}
              </span>
              <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:inline">
                {formatDate(draft.updatedAt)}
              </span>
              <ComposeDialog
                {...compose}
                initial={{
                  to: draft.to ?? "",
                  cc: draft.cc ?? "",
                  subject: draft.subject ?? "",
                  body: draft.body ?? "",
                  draftId: draft.id,
                }}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label="Edit draft">
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete draft"
                disabled={pending}
                onClick={() => remove(draft.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
