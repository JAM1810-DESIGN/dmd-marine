"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { uploadProjectDocument } from "../actions";
import { EmptyState } from "@/components/shared/empty-state";

type DocumentRow = {
  id: string;
  fileName: string;
  url: string;
  category: string;
  sizeBytes: number | null;
  createdAt: string;
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function DocumentsSection({
  projectId,
  documents,
  storageConfigured,
  canManage,
}: {
  projectId: string;
  documents: DocumentRow[];
  storageConfigured: boolean;
  canManage: boolean;
}) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await uploadProjectDocument(projectId, {}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      notify.success("Document uploaded");
      formRef.current?.reset();
    });
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="p-4">
        <h2 className="font-heading text-base font-semibold">Documents &amp; Reports</h2>
        <p className="text-sm text-muted-foreground">
          Files and deliverables attached to this project.
        </p>
      </div>

      {documents.length === 0 ? (
        <EmptyState className="border-none" title="No documents yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 hover:underline"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(doc.sizeBytes)}</p>
                </div>
              </a>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{doc.category.replace(/_/g, " ")}</Badge>
                <a
                  href={doc.url}
                  download
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label={`Download ${doc.fileName}`}
                  title="Download"
                >
                  <Download className="size-4" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && storageConfigured && (
        <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-2 p-4 pt-2">
          <input type="file" name="file" required className="text-sm" />
          <Select name="category" defaultValue="PROJECT_DOCUMENT">
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PROJECT_DOCUMENT">Document</SelectItem>
              <SelectItem value="PROJECT_REPORT">Report</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={isPending}>
            <Upload className="size-4" />
            {isPending ? "Uploading..." : "Upload"}
          </Button>
        </form>
      )}
      {canManage && !storageConfigured && (
        <p className="px-4 pb-4 text-xs text-muted-foreground">
          File uploads require Cloudinary to be configured.
        </p>
      )}
      {error && <p className="px-4 pb-4 text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
