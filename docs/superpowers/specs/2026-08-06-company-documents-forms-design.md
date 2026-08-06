# Company Documents & Forms Module

Date: 2026-08-06

## Context

This is sub-project 3 of 4 from a larger request (Currency conversion — done,
merged. Consultants directory — done, merged. **Company Documents & Forms**.
Projects required-forms — not started). Build order: Currency → Consultants
→ **Documents & Forms** → Projects required-forms.

No standalone company-document/form entity exists today. The only existing
file-attachment model, `Document`, is always transaction-scoped
(`bookingId`/`projectId`/`expenseId`, at least one required in practice) and
has no `title`/`description` fields — it's a lightweight receipt/report
attachment, not a browsable company-level document library.

At decomposition time (before any sub-project was built), the user decided
Documents & Forms and the later Projects-required-forms sub-project should
share one Form entity: a "Company Form" created here becomes assignable to a
Service in the later sub-project.

Confirmed with user in this session:
- RBAC: ADMIN + MANAGER manage (add/edit/delete/upload); every signed-in
  dashboard role (STAFF, FINANCE_OFFICER included) can view/search/download
  — matches the existing Services module's access pattern.
- Pagination: simple client-side, 10 per page, matching every other list in
  this app (all client-fetch-full-list-then-filter, no server-side
  pagination exists anywhere) — this module just adds Prev/Next controls
  over the already-filtered result and resets to page 1 on search/filter
  change.

## 1. Schema

New model, deliberately separate from `Document` (different shape/purpose —
standalone with title/description, never transaction-scoped):

```prisma
enum CompanyDocumentCategory {
  DOCUMENT
  FORM
}

model CompanyDocument {
  id           String                   @id @default(cuid())
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

`User` gains one new relation field, `companyDocumentsUploaded CompanyDocument[]`
(same `onDelete: SetNull` pattern as `Document.uploadedBy` — deleting a
`User` never cascades into deleting their uploaded documents).

This IS the shared Form entity the user asked for at decomposition: when the
Projects-required-forms sub-project is built, it will query
`CompanyDocument` rows filtered to `category: "FORM"` and reference them via
a join table that sub-project owns (e.g. `ServiceRequiredForm` with
`serviceId`, `companyDocumentId`, `required: Boolean`, `order: Int`) — not
built now, this sub-project's job is only to produce the pool of `FORM`-
category rows to choose from later.

## 2. Upload — reuses existing infra exactly

`src/lib/storage.ts`'s `uploadFile(file, folder)` (Cloudinary,
`isStorageConfigured` gate) — the same function `uploadProjectDocument`
(`src/app/dashboard/projects/actions.ts:132-160`) already calls. New
uploads go to Cloudinary folder `"company-documents"`. No changes to
`storage.ts`.

## 3. Route, nav, RBAC

New route `/dashboard/documents`. New sidebar entry, label "Documents &
Forms", positioned after "Consultants" (both are directory-style
management screens under similar RBAC tiers). Page itself: every signed-in
role can view; `canManage = role === "ADMIN" || role === "MANAGER"` gates
Add/Edit/Delete/Upload, matching the existing `services/page.tsx` pattern
exactly (`canManage` computed, passed to the table, conditionally renders
management controls) — not an all-or-nothing `<AccessDenied>` gate like
Settings/Consultants, since everyone needs to browse and download.

## 4. List UI

- Search by title (client-side substring, case-insensitive — same pattern
  as `customers-table.tsx`).
- Category filter: All / Documents / Forms (a `Select`, same component used
  everywhere else in this app).
- Client-side pagination: 10 rows/page, Prev/Next controls, resets to page
  1 whenever the search query or category filter changes.
- Columns: Title (+ description beneath, truncated), Category badge, File
  size, Uploaded date, Last updated, actions (View / Download / Edit /
  Delete, management actions only visible when `canManage`).
- "View" opens `url` in a new tab (`target="_blank"`, same as
  `documents-section.tsx`'s existing link). "Download" is a separate
  anchor with the `download` attribute, forcing a save-as instead of
  inline browser rendering — the two explicitly separate actions the
  request asked for.

## 5. Create/Edit

One dialog, create-or-edit-via-optional-prop (same pattern as
`service-form-dialog.tsx`/`consultant-form-dialog.tsx`): Title (required),
Category (required, Document/Form select), Description (optional,
textarea), File (required on create, shown as "Replace file" — optional —
on edit so metadata-only edits don't force a re-upload).

## 6. Delete

Real hard delete (`db.companyDocument.delete`), not soft — `CompanyDocument`
has no incoming required foreign keys from any other table (the later
Projects-required-forms join table will use `onDelete: Cascade` or
`SetNull` on its own FK to this table, a decision for that sub-project, not
this one). Gated behind the `ConfirmDialog` component already built for the
Consultants sub-project (`src/components/shared/confirm-dialog.tsx`) — no
new confirm UI needed, first reuse of that component outside Consultants.

Deleting a `CompanyDocument` removes only the database row. The underlying
Cloudinary file is NOT deleted — there is no existing delete-and-clean-up-
storage precedent anywhere in this codebase (no code path deletes a
`Document` row at all today, transaction-scoped or otherwise), and adding
Cloudinary asset-deletion is new infrastructure beyond what this module
needs. Documented as an accepted tradeoff, not an oversight.

## 7. Out of scope

- No join table / Service assignment logic — that's the next sub-project.
- No versioning (uploading a new file on edit replaces the record's file
  reference; the old Cloudinary asset is simply orphaned, same tradeoff as
  delete).
- No server-side pagination.
- No Cloudinary asset deletion on record delete or edit-replace.
- No preview/thumbnail generation — View just opens the raw file URL.

## Testing

No automated test suite exists in this project (established convention) —
verification is `pnpm typecheck`, `pnpm lint`, `pnpm build`, and manual
browser checks:
- `/dashboard/documents` loads for every role; Add/Edit/Delete controls
  only render for ADMIN/MANAGER.
- Upload a Document and a Form (different categories) → both appear,
  correctly badged.
- Search filters by title substring; category filter narrows to
  Documents-only / Forms-only / All.
- With 11+ records, pagination shows 2 pages, 10 on page 1; changing the
  search query resets to page 1.
- View opens the file in a new tab; Download triggers a save dialog rather
  than inline viewing.
- Edit changes Title/Category/Description without requiring a new file
  upload; uploading a replacement file on edit updates the stored
  `url`/`fileName`/etc.
- Delete → confirmation dialog → row disappears immediately, `GET` on the
  old Cloudinary URL still resolves (confirming the file itself wasn't
  touched, per the documented out-of-scope decision).
- Non-ADMIN/MANAGER roles can view/search/download but see no
  Add/Edit/Delete controls anywhere on the page.
