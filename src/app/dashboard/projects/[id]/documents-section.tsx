"use client";

import { useRef, useTransition } from "react";
import { Download, FileCheck, FolderCheck, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionShell } from "./section-shell";
import {
  attachRequiredFormDocument,
  detachRequiredFormDocument,
  toggleProjectRequiredFormCompleted,
} from "../actions";

type Attachment = { id: string; fileName: string; url: string };
type ChecklistItem = {
  id: string;
  title: string;
  required: boolean;
  completed: boolean;
  attachments: Attachment[];
};
type OtherDocument = { id: string; fileName: string; url: string; category: string; sizeBytes: number | null };

function AttachButton({
  projectId,
  requiredFormId,
  disabled,
}: {
  projectId: string;
  requiredFormId: string;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function onFile(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const result = await attachRequiredFormDocument(projectId, requiredFormId, fd);
      if (result.error) notify.error(result.error);
      else notify.success("Report attached");
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <>
      <input ref={inputRef} type="file" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isPending}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="size-4" />
        {isPending ? "Uploading..." : "Insert report"}
      </Button>
    </>
  );
}

export function DocumentsSection({
  projectId,
  items,
  otherDocuments,
  storageConfigured,
  canManage,
}: {
  projectId: string;
  items: ChecklistItem[];
  otherDocuments: OtherDocument[];
  storageConfigured: boolean;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const done = items.filter((i) => i.completed).length;

  return (
    <SectionShell
      tone="teal"
      icon={FolderCheck}
      title="Documents & Reports"
      description="Every required form appears here — check it off and attach the report."
      count={items.length > 0 ? `${done} of ${items.length} done` : undefined}
    >
      {items.length === 0 ? (
        <EmptyState className="border-none" title="No required forms yet" description="Add forms in the Required Forms box above." />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                className="size-4 shrink-0 rounded border-border accent-accent"
                checked={item.completed}
                disabled={!canManage || isPending}
                onChange={(e) =>
                  startTransition(() => toggleProjectRequiredFormCompleted(projectId, item.id, e.target.checked))
                }
                aria-label={`Mark ${item.title} done`}
              />
              <span className="min-w-0 flex-1">
                <span className={item.completed ? "text-sm font-medium text-muted-foreground line-through" : "text-sm font-medium text-foreground"}>
                  {item.title}
                </span>
                {!item.required && <Badge variant="outline" className="ml-2">Optional</Badge>}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {item.attachments.map((att) => (
                  <span key={att.id} className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-1 text-xs text-foreground">
                    <FileCheck className="size-3.5 text-emerald-600" />
                    <span className="max-w-[10rem] truncate">{att.fileName}</span>
                    <a href={att.url} download className="text-accent hover:text-accent/80" aria-label={`Download ${att.fileName}`} title="Download">
                      <Download className="size-3.5" />
                    </a>
                    {canManage && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${att.fileName}`}
                        onClick={() => startTransition(async () => {
                          const result = await detachRequiredFormDocument(projectId, att.id);
                          if (result.error) notify.error(result.error);
                          else notify.success("Removed");
                        })}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </span>
                ))}
                {canManage && storageConfigured && (
                  <AttachButton projectId={projectId} requiredFormId={item.id} disabled={isPending} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && !storageConfigured && (
        <p className="px-4 pb-4 text-xs text-muted-foreground">File uploads require Cloudinary to be configured.</p>
      )}

      {otherDocuments.length > 0 && (
        <div className="border-t border-border p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Other attachments</p>
          <ul className="flex flex-col divide-y divide-border">
            {otherDocuments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 py-2">
                <a href={doc.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm text-foreground hover:underline">
                  {doc.fileName}
                </a>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{doc.category.replace(/_/g, " ")}</Badge>
                  <a href={doc.url} download className="text-muted-foreground hover:text-foreground" aria-label={`Download ${doc.fileName}`}>
                    <Download className="size-4" />
                  </a>
                  {canManage && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${doc.fileName}`}
                      onClick={() => startTransition(async () => {
                        const result = await detachRequiredFormDocument(projectId, doc.id);
                        if (result.error) notify.error(result.error);
                        else notify.success("Removed");
                      })}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionShell>
  );
}
