"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Download, ChevronLeft, ChevronRight } from "lucide-react";
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
import { deleteCompanyDocument } from "./actions";
import { DocumentFormDialog, type CompanyDocumentRecord } from "./document-form-dialog";

export type CompanyDocumentRow = CompanyDocumentRecord & {
  fileName: string;
  url: string;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
};

type CategoryFilter = "ALL" | "DOCUMENT" | "FORM";

const PAGE_SIZE = 10;

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function DocumentsTable({
  documents,
  canManage,
}: {
  documents: CompanyDocumentRow[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (categoryFilter !== "ALL" && doc.category !== categoryFilter) return false;
      if (!query) return true;
      return doc.title.toLowerCase().includes(query);
    });
  }, [documents, search, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateCategoryFilter(value: CategoryFilter) {
    setCategoryFilter(value);
    setPage(1);
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Documents &amp; Forms</h2>
          <p className="text-sm text-muted-foreground">
            Company documents and downloadable forms.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search by title..."
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            className="sm:w-56"
          />
          <Select
            value={categoryFilter}
            onValueChange={(value) => updateCategoryFilter(value as CategoryFilter)}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              <SelectItem value="DOCUMENT">Documents</SelectItem>
              <SelectItem value="FORM">Forms</SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="border-none"
          title="No documents match your search"
          description="Try a different title or category."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{doc.title}</div>
                    {doc.description && (
                      <div className="max-w-[280px] truncate text-xs text-muted-foreground">
                        {doc.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.category === "FORM" ? "Form" : "Document"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatSize(doc.sizeBytes)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(doc.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(doc.updatedAt)}
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
                            description="This can't be undone."
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
              ))}
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
