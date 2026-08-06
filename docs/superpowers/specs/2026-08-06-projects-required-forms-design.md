# Projects Required-Forms Module

Date: 2026-08-06

## Context

This is sub-project 4 of 4, the final piece of a larger request (Currency
conversion, Consultants directory, Company Documents & Forms — all done and
merged; this is the last one). No dependency chain to anything after it.

The original request's "Projects Module Enhancement" section describes
actions (add/edit/assign/reorder forms, "assign multiple forms to a
service") that are actually about a Service's required-forms *template*,
not the Projects module directly — this ambiguity was the main thing
resolved in this session's brainstorming.

Confirmed with user (after two rounds of clarification, including one
mid-course reversal on question 1):
- Required-forms **assignment happens per-Project**, not purely at the
  Service level (contradicts the original document's literal "assign to a
  service" wording — the user explicitly chose this after I first
  recommended Service-only).
- **But** a Service still defines *default* required forms, which get
  copied onto a new Project at creation time as a starting point —
  reconciling the per-project assignment with the original document's
  Service-level language. After creation, a project's list is independently
  editable and never re-synced from the service automatically.
- Each project's required form gets a **per-project completion checkbox**
  (staff mark it collected/done) — this is the feature's actual day-to-day
  payoff.

Depends on sub-project 3 (Company Documents & Forms): `CompanyDocument`
rows with `category: "FORM"` are the pool every "required form" picker in
this module selects from. No changes to that model.

## 1. Schema — two join tables

```prisma
model ServiceRequiredForm {
  id                String  @id @default(cuid())
  serviceId         String
  companyDocumentId String
  required          Boolean @default(true)
  order             Int     @default(0)

  service         Service         @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  companyDocument CompanyDocument @relation(fields: [companyDocumentId], references: [id], onDelete: Cascade)

  @@unique([serviceId, companyDocumentId])
  @@index([serviceId])
  @@map("service_required_forms")
}

model ProjectRequiredForm {
  id                String    @id @default(cuid())
  projectId         String
  companyDocumentId String
  required          Boolean   @default(true)
  order             Int       @default(0)
  completed         Boolean   @default(false)
  completedAt       DateTime?

  project         Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  companyDocument CompanyDocument @relation(fields: [companyDocumentId], references: [id], onDelete: Cascade)

  @@unique([projectId, companyDocumentId])
  @@index([projectId])
  @@map("project_required_forms")
}
```

`Service` gains `requiredForms ServiceRequiredForm[]`. `Project` gains
`requiredForms ProjectRequiredForm[]`. `CompanyDocument` gains
`serviceAssignments ServiceRequiredForm[]` and
`projectAssignments ProjectRequiredForm[]`. Both join tables cascade-delete
when their `Service`/`Project`/`CompanyDocument` is deleted — an assignment
row is meaningless without its target on either side (and `CompanyDocument`
deletion is a real hard delete per sub-project 3's design, so this is the
only place in the schema that needs to know about that).

`required`/`order` live on both tables (not shared/derived) since a
project's list is independent after the copy — editing "required" on a
project's form must never write back to the service template.

## 2. Copy-on-create

New helper, `src/lib/required-forms.ts`:

```ts
export async function copyServiceRequiredFormsToProject(projectId: string, serviceId: string) {
  const templates = await db.serviceRequiredForm.findMany({ where: { serviceId } });
  if (templates.length === 0) return;

  await db.projectRequiredForm.createMany({
    data: templates.map((t) => ({
      projectId,
      companyDocumentId: t.companyDocumentId,
      required: t.required,
      order: t.order,
    })),
  });
}
```

Called from both project-creation paths in
`src/app/dashboard/projects/actions.ts` — `createProject` (manual dashboard
form) and `createProjectFromBooking` (auto-created when a booking is
converted) — immediately after `db.project.create`, only when the created
project has a non-null `serviceId`. Both paths need it independently; a
project created either way ends up with the same starting checklist.

**Service-change edge case (explicit decision, not an oversight):** if a
project's `serviceId` is edited later via the existing `EditProjectButton`,
the required-forms list is **not** auto-re-copied, re-synced, or cleared —
that risks silently duplicating rows or destroying a staff member's
in-progress completion state. If a project's service changes and its
required forms need updating, an admin adds/removes them manually via the
project's own required-forms section (same UI as adding any other form to
a project). No automatic reconciliation is built.

## 3. Service edit screen — "Required Forms" section

New component `src/app/dashboard/services/required-forms-section.tsx`,
rendered inside `service-form-dialog.tsx` only when editing an existing
service (`service !== undefined`) — a brand-new service has no `id` yet to
attach `ServiceRequiredForm` rows to, and unlike `FAQ` (which is
form-encoded as a JSON blob and submitted together with the rest of the
service on create), required forms are persisted rows with their own
foreign key, so they need a real `serviceId` to exist first. Section is
hidden entirely on create, shown on edit — the same
create-the-parent-record-first constraint every other "assign related rows
via a join table" pattern in this app already has (e.g. Documents
sections, which only exist per already-created Project).

- Lists current `ServiceRequiredForm` rows (ordered), each showing the
  `CompanyDocument` title, a Required Yes/No toggle, up/down reorder
  buttons, and a Remove button.
- "Add Form" opens a `Select` populated from `CompanyDocument` where
  `category: "FORM"`, excluding forms already assigned to this service.
- RBAC: same `canManage` as the rest of `services/page.tsx`
  (ADMIN/MANAGER).

New server actions in `src/app/dashboard/services/actions.ts`:
`addServiceRequiredForm(serviceId, companyDocumentId)`,
`removeServiceRequiredForm(id)`,
`toggleServiceRequiredFormRequired(id, required)`,
`reorderServiceRequiredForm(id, direction: "up" | "down")` — swaps `order`
with the adjacent row in a transaction.

## 4. Project detail page — "Required Forms" section

New component `src/app/dashboard/projects/[id]/required-forms-section.tsx`,
positioned after `SchedulesSection`/before `DocumentsSection` on
`src/app/dashboard/projects/[id]/page.tsx` (grouping "what needs to happen"
before "what's been uploaded" reads better than the reverse). The section
itself always renders, matching `DocumentsSection`'s exact existing
pattern: an `EmptyState` when `project.requiredForms.length === 0`, the
list otherwise, and the "Add Form" control always available to
`canManage` users regardless of whether the list is currently empty — so
an admin can still add forms to a project with no service or no service
defaults.

- Each row: `CompanyDocument` title (linking to its file, reusing the
  View-link pattern from sub-project 3), Required badge, a completion
  checkbox, Remove button, up/down reorder.
- "Add Form" opens the same kind of `Select` as the Service section
  (`CompanyDocument` where `category: "FORM"`, excluding already-assigned).
- RBAC: same `canManage` as the rest of `projects/[id]/page.tsx`
  (ADMIN/MANAGER/STAFF) — broader than the Service section, matching how
  Schedules/Documents on this same page are already staff-manageable.

New server actions in `src/app/dashboard/projects/actions.ts`:
`addProjectRequiredForm(projectId, companyDocumentId)`,
`removeProjectRequiredForm(id)`,
`toggleProjectRequiredFormRequired(id, required)`,
`toggleProjectRequiredFormCompleted(id, completed)` (sets `completedAt` to
`now()` or `null` accordingly), `reorderProjectRequiredForm(id, direction)`.

## 5. Out of scope

- No UI on `CompanyDocument`/`dashboard/documents` showing "used by N
  services/projects" — one-directional assignment only.
- No notification/reminder when a required form isn't completed.
- No bulk "copy this project's forms to another project" tool.
- No re-sync when a service's default list changes after projects already
  exist, or when a project's service is reassigned (see §2).
- No change to `CompanyDocument` itself, `Booking`, or anything in
  sub-projects 1-3 beyond the two new relation fields listed in §1.

## Testing

No automated test suite exists in this project (established convention) —
verification is `pnpm typecheck`, `pnpm lint`, `pnpm build`, and manual
browser checks:
- Add 2-3 required forms to a Service (mix of Required=Yes/No), reorder
  them.
- Create a new Project against that Service → its Required Forms section
  shows the same forms, same required flags, same order, `completed:
  false` on all.
- Create a Project from an accepted Booking whose service has default
  forms → same copy behavior.
- On the Project, toggle one form's completion checkbox → persists on
  reload; toggle Required on a project-level form → doesn't affect the
  Service's template (reload the Service, confirm unchanged); remove a
  form from the project → doesn't remove it from the Service template.
- Add a form directly on a Project that was never in its Service's
  defaults → appears only on that project.
- A Project with no `serviceId` (or a service with no default forms) →
  Required Forms section still renders, showing its empty state; an
  ADMIN/MANAGER/STAFF user can still add forms manually via "Add Form".
- Delete a `CompanyDocument` (Form) that's assigned to a service/project →
  the assignment rows disappear via cascade, no orphaned references, no
  crash on either the Service or Project page.
