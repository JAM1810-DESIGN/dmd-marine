# Company Documents & Forms Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `/dashboard/documents` module (viewable by every dashboard role, managed by ADMIN/MANAGER) with full CRUD over a new `CompanyDocument` model — title/category(Document|Form)/description/file — including search, category filter, client-side pagination, view/download, and confirm-before-delete.

**Architecture:** One new standalone Prisma model (deliberately separate from the existing transaction-scoped `Document` model), reusing the existing Cloudinary upload plumbing (`uploadFile`) and the `ConfirmDialog` component built for the Consultants module. First pagination UI in this codebase — a plain client-side slice over an already-filtered array, matching every other list's client-fetch-then-filter pattern.

**Tech Stack:** Next.js 16 (App Router, Server Components/Actions), Prisma 7, Zod, existing shadcn/Base-UI component set, Cloudinary (existing `src/lib/storage.ts`).

## Global Constraints

- New model `CompanyDocument`, separate from `Document` — no changes to `Document` or its existing usages.
- RBAC: every signed-in dashboard role can view/search/download; `canManage = role === "ADMIN" || role === "MANAGER"` gates Add/Edit/Delete/Upload — matches `services/page.tsx`'s exact pattern, not an all-or-nothing `<AccessDenied>` gate.
- Delete is a real hard delete (`db.companyDocument.delete`) — `CompanyDocument` has no incoming required FKs from any other table. Gated behind `ConfirmDialog` (`src/components/shared/confirm-dialog.tsx`, already built).
- Deleting or replacing a file (on edit) never deletes the underlying Cloudinary asset — no such capability exists anywhere in this codebase today, and adding it is out of scope.
- No audit logging for this module — matches every other non-security-sensitive CRUD action in this codebase (`uploadProjectDocument`, expense receipt upload, etc. don't audit-log either); `logAudit` is reserved for User/security-sensitive actions (Settings, Consultants).
- Pagination is client-side only, 10 rows/page, resets to page 1 on search or category-filter change. No server-side `skip`/`take` pattern.
- This project has no automated test runner (no jest/vitest/playwright in `package.json`) — verification steps use `pnpm typecheck`, `pnpm lint`, `pnpm build`, and manual browser checks instead of a test suite.
- Known, accepted limitation: the HTML `download` attribute on a cross-origin (Cloudinary) URL is not honored by every browser — some will still open the file inline rather than force a save dialog. This is the correct best-effort implementation given the scope; do not add Cloudinary's `fl_attachment` URL-transformation flag or any other workaround — that's explicitly out of scope per the design spec.

---

### Task 1: Schema — `CompanyDocument` model + `CompanyDocumentCategory` enum

**Files:**
- Modify: `prisma/schema.prisma` (add enum, add model, add one relation field to `User`)
- Create: `prisma/migrations/<timestamp>_add_company_documents/migration.sql` (generated, not hand-written)

**Interfaces:**
- Produces: Prisma Client types for `CompanyDocument` (`id`, `title`, `category: "DOCUMENT" | "FORM"`, `description: string | null`, `fileName`, `url`, `mimeType: string | null`, `sizeBytes: number | null`, `uploadedById: string | null`, `createdAt`, `updatedAt`) and `CompanyDocumentCategory` enum. Every later task that queries/creates/updates a `CompanyDocument` uses these exact field names and the enum's two literal values `"DOCUMENT"`/`"FORM"`.

- [ ] **Step 1: Add the enum and model**

In `prisma/schema.prisma`, add a new enum near the other enums (e.g. right after `enum BudgetPeriod { ... }` or any other enum block — placement among existing enums doesn't matter, just keep it grouped with them):

```prisma
enum CompanyDocumentCategory {
  DOCUMENT
  FORM
}
```

Add a new model, placed near `Document` (e.g. immediately after it) for readability:

```prisma
model CompanyDocument {
  id           String                  @id @default(cuid())
  title        String
  category     CompanyDocumentCategory
  description  String?
  fileName     String
  url          String
  mimeType     String?
  sizeBytes    Int?
  uploadedById String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  uploadedBy User? @relation(fields: [uploadedById], references: [id], onDelete: SetNull)

  @@index([category])
  @@map("company_documents")
}
```

- [ ] **Step 2: Add the relation field to `User`**

In `prisma/schema.prisma`'s `model User { ... }`, add one new relation field. Current state of that block (confirm it matches before editing — it may have shifted slightly since this plan was written):

```prisma
  defaultForServices  Service[]            @relation("ServiceDefaultConsultant")
  assignedBookings    Booking[]            @relation("BookingConsultant")
  assignedProjects    Project[]            @relation("ProjectConsultant")
  schedules           Schedule[]
  contactHistory      ContactHistory[]
  documentsUploaded   Document[]
  notifications       Notification[]
  messagesSent        Message[]            @relation("MessagesSent")
  messagesReceived    Message[]            @relation("MessagesReceived")
  expensesCreated     Expense[]            @relation("ExpensesCreated")
  expensesApproved    Expense[]            @relation("ExpensesApproved")
  financialStatements FinancialStatement[]
  blogPosts           BlogPost[]
  auditLogs           AuditLog[]
```

Add `companyDocumentsUploaded CompanyDocument[]` immediately after `documentsUploaded   Document[]`:

```prisma
  defaultForServices        Service[]            @relation("ServiceDefaultConsultant")
  assignedBookings          Booking[]            @relation("BookingConsultant")
  assignedProjects          Project[]            @relation("ProjectConsultant")
  schedules                 Schedule[]
  contactHistory            ContactHistory[]
  documentsUploaded         Document[]
  companyDocumentsUploaded  CompanyDocument[]
  notifications             Notification[]
  messagesSent              Message[]            @relation("MessagesSent")
  messagesReceived          Message[]            @relation("MessagesReceived")
  expensesCreated           Expense[]            @relation("ExpensesCreated")
  expensesApproved          Expense[]            @relation("ExpensesApproved")
  financialStatements       FinancialStatement[]
  blogPosts                 BlogPost[]
  auditLogs                 AuditLog[]
```

(Realignment of the other fields' padding is expected/fine — `prisma format`, run in Step 3, will fix alignment automatically regardless of exactly how it's typed here.)

- [ ] **Step 3: Generate and apply the migration, then format**

```bash
pnpm prisma migrate dev --name add_company_documents
npx prisma format
```
Expected: `Your database is now in sync with your schema`, a new migration folder with `CREATE TYPE "CompanyDocumentCategory"`, `CREATE TABLE "company_documents"`, and the FK to `users`. `prisma format` re-aligns the whole schema file consistently (harmless, matches the project's existing style).

- [ ] **Step 4: Verify**

```bash
pnpm prisma migrate status
pnpm typecheck
```
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add CompanyDocument model for company documents & forms module"
```

---

### Task 2: Validation schema

**Files:**
- Create: `src/lib/validations/company-document.ts`

**Interfaces:**
- Produces: `export const companyDocumentSchema` (Zod), `export type CompanyDocumentInput`. Task 3's server actions parse `title`/`category`/`description` from `FormData` against this schema (file handling stays outside Zod, done manually — matching the existing `uploadProjectDocument` pattern of checking `file instanceof File` directly rather than through Zod).

- [ ] **Step 1: Write the schema**

```ts
// src/lib/validations/company-document.ts
import { z } from "zod";

export const companyDocumentSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  category: z.enum(["DOCUMENT", "FORM"]),
  description: z.string().optional().transform((value) => value || null),
});

export type CompanyDocumentInput = z.infer<typeof companyDocumentSchema>;
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations/company-document.ts
git commit -m "feat: add company document validation schema"
```

---

### Task 3: Server actions

**Files:**
- Create: `src/app/dashboard/documents/actions.ts`

**Interfaces:**
- Consumes: `companyDocumentSchema` from `src/lib/validations/company-document.ts` (Task 2); `requireRole` from `@/lib/rbac`; `uploadFile`/`isStorageConfigured` from `@/lib/storage` (existing); `db` from `@/lib/db`.
- Produces: `export type ActionState = { error?: string; success?: boolean }`, `export async function createCompanyDocument(_prevState: ActionState, formData: FormData): Promise<ActionState>`, `export async function updateCompanyDocument(id: string, _prevState: ActionState, formData: FormData): Promise<ActionState>`, `export async function deleteCompanyDocument(id: string): Promise<void>`. Tasks 4 and 5 call these exact names/signatures.

- [ ] **Step 1: Write the module**

```ts
// src/app/dashboard/documents/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { uploadFile, isStorageConfigured } from "@/lib/storage";
import { companyDocumentSchema } from "@/lib/validations/company-document";

export type ActionState = { error?: string; success?: boolean };

export async function createCompanyDocument(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER");

  if (!isStorageConfigured) {
    return { error: "File storage is not configured yet." };
  }

  const parsed = companyDocumentSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }

  const uploaded = await uploadFile(file, "company-documents");

  await db.companyDocument.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      fileName: uploaded.fileName,
      url: uploaded.url,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
    },
  });

  revalidatePath("/dashboard/documents");
  return { success: true };
}

export async function updateCompanyDocument(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER");

  const parsed = companyDocumentSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const file = formData.get("file");
  const hasNewFile = file instanceof File && file.size > 0;

  if (hasNewFile && !isStorageConfigured) {
    return { error: "File storage is not configured yet." };
  }

  const uploaded = hasNewFile ? await uploadFile(file, "company-documents") : null;

  await db.companyDocument.update({
    where: { id },
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      ...(uploaded
        ? {
            fileName: uploaded.fileName,
            url: uploaded.url,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
          }
        : {}),
    },
  });

  revalidatePath("/dashboard/documents");
  return { success: true };
}

export async function deleteCompanyDocument(id: string): Promise<void> {
  await requireRole("ADMIN", "MANAGER");
  await db.companyDocument.delete({ where: { id } });
  revalidatePath("/dashboard/documents");
}
```

Note `hasNewFile` uses a TypeScript type guard (`file instanceof File`), so `uploaded` is correctly typed `UploadedFile | null` and the spread `...(uploaded ? {...} : {})` only includes the file fields when a real replacement file was provided — an edit that only changes Title/Category/Description leaves the existing `fileName`/`url`/`mimeType`/`sizeBytes` untouched.

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/documents/actions.ts
git commit -m "feat: add company document create/update/delete server actions"
```

---

### Task 4: `DocumentFormDialog`

**Files:**
- Create: `src/app/dashboard/documents/document-form-dialog.tsx`

**Interfaces:**
- Consumes: `createCompanyDocument`/`updateCompanyDocument` from `./actions` (Task 3); `notify` from `@/lib/notify` (existing); `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogTrigger` from `@/components/ui/dialog`; `Label`/`Input`/`Textarea`/`Button` from `@/components/ui/*`; `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` from `@/components/ui/select`.
- Produces: `export function DocumentFormDialog({ trigger, document }: { trigger: React.ReactElement; document?: CompanyDocumentRecord }): JSX.Element` where `export type CompanyDocumentRecord = { id: string; title: string; category: "DOCUMENT" | "FORM"; description: string | null }`. Task 5 imports `CompanyDocumentRecord` and renders this dialog for both "New Document" and per-row "Edit" triggers.

- [ ] **Step 1: Write the component**

Modeled on `src/app/dashboard/consultants/consultant-form-dialog.tsx`'s create/edit pattern, with the file input following `src/app/dashboard/projects/[id]/documents-section.tsx`'s plain `<input type="file">` (required only on create).

```tsx
// src/app/dashboard/documents/document-form-dialog.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { createCompanyDocument, updateCompanyDocument } from "./actions";

export type CompanyDocumentRecord = {
  id: string;
  title: string;
  category: "DOCUMENT" | "FORM";
  description: string | null;
};

export function DocumentFormDialog({
  trigger,
  document,
}: {
  trigger: React.ReactElement;
  document?: CompanyDocumentRecord;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = document
        ? await updateCompanyDocument(document.id, {}, formData)
        : await createCompanyDocument({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      notify.success(document ? "Document updated" : "Document created");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{document ? "Edit Document" : "New Document"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={document?.title} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Select name="category" defaultValue={document?.category ?? "DOCUMENT"} required>
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DOCUMENT">Company Document</SelectItem>
                <SelectItem value="FORM">Company Form</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={document?.description ?? ""}
              rows={3}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="file">{document ? "Replace File (optional)" : "File"}</Label>
            <input id="file" name="file" type="file" required={!document} className="text-sm" />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="self-end">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/documents/document-form-dialog.tsx
git commit -m "feat: add company document create/edit form dialog"
```

---

### Task 5: `DocumentsTable`

**Files:**
- Create: `src/app/dashboard/documents/documents-table.tsx`

**Interfaces:**
- Consumes: `DocumentFormDialog`, `type CompanyDocumentRecord` from `./document-form-dialog` (Task 4); `deleteCompanyDocument` from `./actions` (Task 3); `ConfirmDialog` from `@/components/shared/confirm-dialog` (existing, built for Consultants); `EmptyState` from `@/components/shared/empty-state` (existing); `notify` from `@/lib/notify`.
- Produces: `export function DocumentsTable({ documents, canManage }: { documents: CompanyDocumentRow[]; canManage: boolean }): JSX.Element` where `export type CompanyDocumentRow = CompanyDocumentRecord & { fileName: string; url: string; sizeBytes: number | null; createdAt: string; updatedAt: string }`. Task 6 imports `CompanyDocumentRow` and passes the fetched list.

- [ ] **Step 1: Write the component**

Search-by-title and category-filter patterns copied from `src/app/dashboard/expenses/expenses-table.tsx`'s existing `Select`-based filter idiom. Pagination is new (no precedent in this codebase) — a plain array slice with Prev/Next buttons.

```tsx
// src/app/dashboard/documents/documents-table.tsx
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
```

Note the `nativeButton={false}` prop on the View/Download buttons — required whenever `Button`'s `render` prop points at a non-`<button>` element (e.g. an `<a>`), matching the existing pattern in `src/app/not-found.tsx:11` and `src/components/marketing/contact-cta.tsx:18-19` (those use `<Link>`; here it's a plain `<a>` since `doc.url` is an external Cloudinary URL, not an internal Next.js route).

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/documents/documents-table.tsx
git commit -m "feat: add documents table with search, category filter, pagination, view/download/delete"
```

---

### Task 6: Page + sidebar nav entry

**Files:**
- Create: `src/app/dashboard/documents/page.tsx`
- Modify: `src/components/shared/sidebar.tsx`

**Interfaces:**
- Consumes: `DocumentsTable`, `type CompanyDocumentRow` from `./documents-table` (Task 5).
- Produces: nothing consumed by later tasks — final wiring point.

- [ ] **Step 1: Write the page**

Modeled on `src/app/dashboard/services/page.tsx`'s `canManage` pattern (view-for-everyone, manage-gated), not the all-or-nothing `<AccessDenied>` gate used by Settings/Consultants.

```tsx
// src/app/dashboard/documents/page.tsx
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DocumentsTable } from "./documents-table";

export const metadata: Metadata = { title: "Documents & Forms" };

export default async function DocumentsPage() {
  const session = await auth();
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  const documents = await db.companyDocument.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Documents &amp; Forms</h1>
        <p className="text-sm text-muted-foreground">
          Company documents and downloadable forms.
        </p>
      </div>

      <DocumentsTable
        canManage={canManage}
        documents={documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          description: doc.description,
          fileName: doc.fileName,
          url: doc.url,
          sizeBytes: doc.sizeBytes,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add the sidebar nav entry**

In `src/components/shared/sidebar.tsx`, add `FileText` to the `lucide-react` import list (confirmed not already imported in this file) and insert a new `NAV_ITEMS` entry immediately after the `/dashboard/consultants` entry:

```ts
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  UserCog,
  Wrench,
  FolderKanban,
  Calendar,
  MessageSquare,
  Megaphone,
  Wallet,
  BarChart3,
  Settings,
  FileText,
} from "lucide-react";
```

```ts
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarClock, enabled: true },
  { href: "/dashboard/customers", label: "Customers", icon: Users, enabled: true },
  { href: "/dashboard/consultants", label: "Consultants", icon: UserCog, enabled: true },
  { href: "/dashboard/documents", label: "Documents & Forms", icon: FileText, enabled: true },
  { href: "/dashboard/services", label: "Services", icon: Wrench, enabled: true },
  ...
```

(Only the `FileText` import addition — if not already present — and the one new `NAV_ITEMS` array entry change. Every other line in the file stays exactly as-is.)

- [ ] **Step 3: Verify**

```bash
pnpm typecheck
pnpm lint
pnpm build
```
Expected: all three clean/succeed.

- [ ] **Step 4: Manual check**

```bash
pnpm dev
```
Sign in as the dev admin (`admin@dmdmarine.dev` / `DevAdmin123!`), click "Documents & Forms" in the sidebar. Expected: page loads; "New Document" uploads a file with Title/Category/Description; the row appears with correct category badge, size, dates; Edit updates metadata without requiring a new file, or replaces the file when one is chosen; Delete opens a confirmation, confirms, and the row disappears; View opens the file in a new tab; Download triggers a save dialog in most browsers (some browsers may still open cross-origin Cloudinary URLs inline instead of forcing a download — this is a known, accepted limitation, not a bug to chase).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/documents/page.tsx src/components/shared/sidebar.tsx
git commit -m "feat: add documents & forms page and sidebar nav entry"
```

---

### Task 7: Full verification pass

**Files:** None modified — this task only runs checks.

**Interfaces:** None.

- [ ] **Step 1: Static checks**

```bash
pnpm typecheck
pnpm lint
pnpm build
```
Expected: all three clean/succeed.

- [ ] **Step 2: Manual browser walkthrough**

With `pnpm dev` running, signed in as ADMIN or MANAGER:
- `/dashboard/documents` — page loads, "New Document" button visible.
- Upload a Document (category=Document) and a Form (category=Form) → both appear with correct badges.
- Search by a substring of one title → only matching rows show.
- Category filter to "Forms" → only Form-category rows show; back to "All categories" → both show again.
- Upload 11+ documents total (or trust the pagination logic if seeding that many is impractical — confirm the `Math.ceil`/slice math by reading the code if you can't easily seed 11 rows) → confirm 2 pages appear, 10 rows on page 1, Prev disabled on page 1 / Next disabled on the last page.
- Changing the search query while on page 2 → resets to page 1.
- Edit a document's Title only (no new file) → title updates, `url`/`fileName` unchanged (confirm by checking the View link still points at the original file).
- Edit a document WITH a new file → `url`/`fileName`/size update to the new file's values.
- Delete → confirmation dialog → row disappears immediately.
- Sign in as a non-ADMIN/non-MANAGER role (STAFF/FINANCE_OFFICER) → `/dashboard/documents` loads and shows the full list, but no "New Document" button and no Edit/Delete icons on any row — View/Download still work.
- Browser console: no errors on any of the above.

- [ ] **Step 3: Final commit (if any cleanup was needed)**

Only if Step 1–2 surfaced fixes:
```bash
git add -A
git commit -m "fix: address issues found in full verification pass"
```
