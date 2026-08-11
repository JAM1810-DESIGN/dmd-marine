"use client";

import { useRef, useTransition } from "react";
import { Paperclip, Download, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { notify } from "@/lib/notify";
import { uploadInvoiceAttachment, deleteInvoiceAttachment } from "../actions";

export type AttachmentRow = { id: string; fileName: string; url: string };

export function InvoiceAttachments({
  invoiceId,
  attachments,
  canManage,
  canUpload,
  storageConfigured,
}: {
  invoiceId: string;
  attachments: AttachmentRow[];
  canManage: boolean;
  canUpload: boolean;
  storageConfigured: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function onFile(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const result = await uploadInvoiceAttachment(invoiceId, fd);
      if (result.error) notify.error(result.error);
      else notify.success("Attached");
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 print:hidden">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold">Attachments</h2>
        {canManage && canUpload && storageConfigured && (
          <>
            <input ref={inputRef} type="file" accept="application/pdf,image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <Button variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
              <Paperclip className="size-4" />
              {pending ? "Uploading..." : "Attach quotation / PDF"}
            </Button>
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <EmptyState className="border-none" icon={FileText} title="No attachments" description="Attach the quotation PDF or supporting files." />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {attachments.map((att) => (
            <li key={att.id} className="flex items-center justify-between gap-3 py-2">
              <a href={att.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 hover:underline">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm text-foreground">{att.fileName}</span>
              </a>
              <div className="flex items-center gap-2">
                <a href={att.url} download className="text-muted-foreground hover:text-foreground" aria-label={`Download ${att.fileName}`}>
                  <Download className="size-4" />
                </a>
                {canManage && canUpload && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${att.fileName}`}
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteInvoiceAttachment(invoiceId, att.id);
                        if (result.error) notify.error(result.error);
                        else notify.success("Removed");
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && canUpload && !storageConfigured && (
        <p className="mt-2 text-xs text-muted-foreground">File uploads require Cloudinary to be configured.</p>
      )}
    </div>
  );
}
