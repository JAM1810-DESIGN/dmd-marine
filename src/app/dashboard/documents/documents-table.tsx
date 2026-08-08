"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { deleteCompanyDocument } from "./actions";
import { DocumentFormDialog, type CompanyDocumentRecord } from "./document-form-dialog";

export type CompanyDocumentRow = CompanyDocumentRecord & {
  fileName: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploaderId: string | null;
  uploaderName: string | null;
  serviceCount: number;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
};

type CategoryFilter = "ALL" | "DOCUMENT" | "FORM";
type SortBy = "recent" | "title" | "size" | "expiry" | "usage";

const PAGE_SIZE = 10;
const EXPIRING_DAYS = 30;

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
  const type = mimeType ?? "";
  let Icon = FileIcon;
  let className = "bg-secondary text-muted-foreground";
  if (type.includes("pdf")) {
    Icon = FileText;
    className = "bg-destructive/15 text-destructive";
  } else if (type.startsWith("image/")) {
    Icon = ImageIcon;
    className = "bg-success/15 text-success";
  } else if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) {
    Icon = FileSpreadsheet;
    className = "bg-success/15 text-success";
  } else if (type.includes("word") || type.includes("document")) {
    Icon = FileText;
    className = "bg-ocean/15 text-ocean";
  }
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", className)}>
      <Icon className="size-4" />
    </span>
  );
}

function expiryInfo(iso: string | null) {
  if (!iso) return null;
  const now = Date.now();
  const expiry = new Date(iso).getTime();
  const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Expired", className: "bg-destructive/15 text-destructive" };
  if (days <= EXPIRING_DAYS)
    return { label: `Expires in ${days}d`, className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  return { label: formatDate(iso), className: "text-muted-foreground" };
}

function ExpiryCell({ iso }: { iso: string | null }) {
  const info = expiryInfo(iso);
  if (!info) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", info.className)}>
      {info.label}
    </span>
  );
}

function UsageCell({ services, projects }: { services: number; projects: number }) {
  if (services === 0 && projects === 0) {
    return <span className="text-xs text-muted-foreground">Not in use</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {services > 0 && (
        <Badge variant="outline">
          {services} {services === 1 ? "service" : "services"}
        </Badge>
      )}
      {projects > 0 && (
        <Badge variant="outline">
          {projects} {projects === 1 ? "project" : "projects"}
        </Badge>
      )}
    </div>
  );
}

export function DocumentsTable({
  documents,
  canManage,
  uploaders,
}: {
  documents: CompanyDocumentRow[];
  canManage: boolean;
  uploaders: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [uploaderFilter, setUploaderFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = documents.filter((doc) => {
      if (categoryFilter !== "ALL" && doc.category !== categoryFilter) return false;
      if (uploaderFilter !== "ALL" && doc.uploaderId !== uploaderFilter) return false;
      if (query && !doc.title.toLowerCase().includes(query)) return false;
      return true;
    });

    return [...rows].sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "size":
          return (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0);
        case "usage":
          return b.serviceCount + b.projectCount - (a.serviceCount + a.projectCount);
        case "expiry": {
          const av = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
          const bv = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
          return av - bv;
        }
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [documents, search, categoryFilter, uploaderFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-base font-semibold">Documents &amp; Forms</h2>
            <p className="text-sm text-muted-foreground">
              Company documents and downloadable forms, with usage and expiry.
            </p>
          </div>
          {canManage && (
            <DocumentFormDialog
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  New Document
                </Button>
              }
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search by title..."
            value={search}
            onChange={(event) => resetPage(setSearch)(event.target.value)}
            className="sm:w-56"
          />
          <Select value={categoryFilter} onValueChange={(v) => resetPage(setCategoryFilter)(v as CategoryFilter)}>
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              <SelectItem value="DOCUMENT">Documents</SelectItem>
              <SelectItem value="FORM">Forms</SelectItem>
            </SelectContent>
          </Select>
          {uploaders.length > 0 && (
            <Select value={uploaderFilter} onValueChange={(v) => resetPage(setUploaderFilter)(v ?? "ALL")}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All uploaders</SelectItem>
                {uploaders.map((uploader) => (
                  <SelectItem key={uploader.id} value={uploader.id}>
                    {uploader.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Sort: Newest</SelectItem>
              <SelectItem value="title">Sort: Title</SelectItem>
              <SelectItem value="size">Sort: Size</SelectItem>
              <SelectItem value="expiry">Sort: Expiry</SelectItem>
              <SelectItem value="usage">Sort: Usage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="border-none"
          title="No documents match your filters"
          description="Try a different title, category, or uploader."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Used by</TableHead>
                <TableHead>Uploaded by</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((doc) => {
                const inUse = doc.serviceCount + doc.projectCount;
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileTypeIcon mimeType={doc.mimeType} />
                        <div>
                          <div className="font-medium text-foreground">{doc.title}</div>
                          {doc.description && (
                            <div className="max-w-[240px] truncate text-xs text-muted-foreground">
                              {doc.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.category === "FORM" ? "Form" : "Document"}</Badge>
                    </TableCell>
                    <TableCell>
                      <UsageCell services={doc.serviceCount} projects={doc.projectCount} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.uploaderName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ExpiryCell iso={doc.expiresAt} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSize(doc.sizeBytes)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="View"
                          nativeButton={false}
                          render={<a href={doc.url} target="_blank" rel="noreferrer" />}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Download"
                          nativeButton={false}
                          render={<a href={doc.url} download={doc.fileName} />}
                        >
                          <Download className="size-4" />
                        </Button>
                        {canManage && (
                          <>
                            <DocumentFormDialog
                              key={doc.id}
                              document={doc}
                              trigger={
                                <Button variant="ghost" size="icon-sm" aria-label="Edit document">
                                  <Pencil className="size-4" />
                                </Button>
                              }
                            />
                            <ConfirmDialog
                              trigger={
                                <Button variant="ghost" size="icon-sm" aria-label="Delete document">
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              }
                              title={`Delete "${doc.title}"?`}
                              description={
                                inUse > 0
                                  ? `In use by ${doc.serviceCount} ${doc.serviceCount === 1 ? "service" : "services"} and ${doc.projectCount} project ${doc.projectCount === 1 ? "checklist" : "checklists"}. Deleting removes it from all of them. This can't be undone.`
                                  : "This can't be undone."
                              }
                              confirmLabel="Delete"
                              variant="destructive"
                              onConfirm={async () => {
                                await deleteCompanyDocument(doc.id);
                                notify.success("Document deleted");
                              }}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border p-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
