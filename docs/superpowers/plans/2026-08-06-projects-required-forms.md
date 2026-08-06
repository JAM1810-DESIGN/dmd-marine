# Projects Required-Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Service define a default list of required forms (`CompanyDocument` rows with `category: "FORM"`); copy that list onto a Project when it's created; let each Project's list be edited and checked off independently thereafter.

**Architecture:** Two new join tables (`ServiceRequiredForm`, `ProjectRequiredForm`), both pointing at `CompanyDocument`. A copy-on-create helper runs once, at project creation, from either creation path. Two new UI sections — one in the Service edit dialog (template management), one on the Project detail page (per-project checklist with a completion checkbox) — each backed by their own small set of server actions (add/remove/toggle-required/reorder, plus toggle-completed on the project side only).

**Tech Stack:** Next.js 16 App Router, Server Components + Server Actions, Prisma 7 + Postgres, Zod (unused here — no form-encoded input, actions take typed args directly), `requireRole` for RBAC.

## Global Constraints

- No automated test suite exists in this project — verification is `pnpm typecheck`, `pnpm lint`, `pnpm build`, and manual browser checks. Never invent a test framework.
- Required-forms assignment happens per-Project. A Service only defines *defaults*, copied onto a Project at creation time; after that the project's list is fully independent (editing/removing on a project never writes back to the service template, and a service's template changing later never re-syncs existing projects).
- Service-side RBAC: `ADMIN`/`MANAGER` (matches `services/page.tsx`'s existing `canManage`).
- Project-side RBAC: `ADMIN`/`MANAGER`/`STAFF` (matches `projects/[id]/page.tsx`'s existing `canManage`, and `PROJECT_ROLES` in `projects/actions.ts`).
- Both join tables cascade-delete when their `Service`/`Project`/`CompanyDocument` is deleted.
- The Project's Required Forms section always renders (empty state when the list is empty), matching `DocumentsSection`'s existing pattern — never conditionally hidden.
- The Service's Required Forms section only renders in edit mode (`service !== undefined`) — a new service has no `id` yet to attach rows to.
- Reuse existing components exactly as they are: `Button`, `Badge`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue`, `EmptyState`, `notify`. No new shared components needed — reorder (up/down) and the completion checkbox are new interaction patterns but built from existing primitives.
- Migration command: `pnpm db:migrate --name <name>` (wraps `prisma migrate dev`). Regenerate the client after any schema change: `pnpm db:generate`.

---

### Task 1: Schema — join tables + migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `db.serviceRequiredForm` and `db.projectRequiredForm` Prisma delegates, with fields `id, serviceId/projectId, companyDocumentId, required, order` (plus `completed, completedAt` on the project table only). `Service.requiredForms`, `Project.requiredForms`, `CompanyDocument.serviceAssignments`, `CompanyDocument.projectAssignments` relation fields for `include`.

- [ ] **Step 1: Add the two new models**

Insert after the `CompanyDocument` model (currently ends at line 494, right before the `// COMMUNICATION` section comment) in `prisma/schema.prisma`:

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

- [ ] **Step 2: Add the relation fields to `Service`, `Project`, and `CompanyDocument`**

In the `Service` model, add `requiredForms` to the relations block. Change:

```prisma
  category          ServiceCategory @relation(fields: [categoryId], references: [id])
  parent            Service?        @relation("ServiceHierarchy", fields: [parentServiceId], references: [id], onDelete: SetNull)
  children          Service[]       @relation("ServiceHierarchy")
  defaultConsultant User?           @relation("ServiceDefaultConsultant", fields: [defaultConsultantId], references: [id], onDelete: SetNull)
  bookings          Booking[]
  projects          Project[]
  invoices          Invoice[]
  invoiceItems      InvoiceItem[]
```

to:

```prisma
  category          ServiceCategory @relation(fields: [categoryId], references: [id])
  parent            Service?        @relation("ServiceHierarchy", fields: [parentServiceId], references: [id], onDelete: SetNull)
  children          Service[]       @relation("ServiceHierarchy")
  defaultConsultant User?           @relation("ServiceDefaultConsultant", fields: [defaultConsultantId], references: [id], onDelete: SetNull)
  bookings          Booking[]
  projects          Project[]
  invoices          Invoice[]
  invoiceItems      InvoiceItem[]
  requiredForms     ServiceRequiredForm[]
```

In the `Project` model, add `requiredForms`. Change:

```prisma
  customer   Customer?  @relation(fields: [customerId], references: [id], onDelete: SetNull)
  company    Company?   @relation(fields: [companyId], references: [id], onDelete: SetNull)
  vessel     Vessel?    @relation(fields: [vesselId], references: [id], onDelete: SetNull)
  booking    Booking?   @relation(fields: [bookingId], references: [id], onDelete: SetNull)
  service    Service?   @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  consultant User       @relation("ProjectConsultant", fields: [consultantId], references: [id])
  branch     Branch?    @relation(fields: [branchId], references: [id], onDelete: SetNull)
  documents  Document[]
  schedules  Schedule[]
  expenses   Expense[]
  invoices   Invoice[]
```

to:

```prisma
  customer      Customer?             @relation(fields: [customerId], references: [id], onDelete: SetNull)
  company       Company?              @relation(fields: [companyId], references: [id], onDelete: SetNull)
  vessel        Vessel?               @relation(fields: [vesselId], references: [id], onDelete: SetNull)
  booking       Booking?              @relation(fields: [bookingId], references: [id], onDelete: SetNull)
  service       Service?              @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  consultant    User                  @relation("ProjectConsultant", fields: [consultantId], references: [id])
  branch        Branch?               @relation(fields: [branchId], references: [id], onDelete: SetNull)
  documents     Document[]
  schedules     Schedule[]
  expenses      Expense[]
  invoices      Invoice[]
  requiredForms ProjectRequiredForm[]
```

In the `CompanyDocument` model, add both back-relations. Change:

```prisma
  uploadedBy User? @relation(fields: [uploadedById], references: [id], onDelete: SetNull)

  @@index([category])
  @@map("company_documents")
```

to:

```prisma
  uploadedBy         User?                 @relation(fields: [uploadedById], references: [id], onDelete: SetNull)
  serviceAssignments ServiceRequiredForm[]
  projectAssignments ProjectRequiredForm[]

  @@index([category])
  @@map("company_documents")
```

- [ ] **Step 3: Run the migration**

```bash
pnpm db:migrate --name add_project_required_forms
```

Expected: prompts complete without data-loss warnings (both tables are brand new), creates `prisma/migrations/<timestamp>_add_project_required_forms/`.

- [ ] **Step 4: Regenerate the Prisma client**

```bash
pnpm db:generate
```

Expected: exits 0. `db.serviceRequiredForm` / `db.projectRequiredForm` are now valid `db.*` delegates for the rest of the plan's tasks.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add ServiceRequiredForm and ProjectRequiredForm models"
```

---

### Task 2: Copy-on-create helper

**Files:**
- Create: `src/lib/required-forms.ts`
- Modify: `src/app/dashboard/projects/actions.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/db`; `db.serviceRequiredForm`, `db.projectRequiredForm` (Task 1).
- Produces: `copyServiceRequiredFormsToProject(projectId: string, serviceId: string): Promise<void>` — used by Task 2's own edits to `createProject`/`createProjectFromBooking`, and by no other task.

- [ ] **Step 1: Create the helper**

`src/lib/required-forms.ts`:

```ts
import { db } from "@/lib/db";

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

- [ ] **Step 2: Wire into `createProject`**

In `src/app/dashboard/projects/actions.ts`, the `createProject` function currently ends with:

```ts
  const { startDate, endDate, ...rest } = parsed.data;
  const companyId = await resolveCompanyId(rest.customerId);

  await db.project.create({
    data: {
      ...rest,
      companyId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });

  revalidatePath("/dashboard/projects");
  return { success: true };
}
```

Change to capture the created project and copy its service's default forms:

```ts
  const { startDate, endDate, ...rest } = parsed.data;
  const companyId = await resolveCompanyId(rest.customerId);

  const project = await db.project.create({
    data: {
      ...rest,
      companyId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });

  if (project.serviceId) {
    await copyServiceRequiredFormsToProject(project.id, project.serviceId);
  }

  revalidatePath("/dashboard/projects");
  return { success: true };
}
```

- [ ] **Step 3: Wire into `createProjectFromBooking`**

In the same file, `createProjectFromBooking` currently ends with:

```ts
    const project = await db.project.create({
      data: {
        name: `${booking.customerName} — ${booking.vesselName ?? "Project"}`,
        customerId: booking.customerId,
        companyId: booking.companyId,
        vesselId: booking.vesselId,
        serviceId: booking.serviceId,
        bookingId: booking.id,
        consultantId: booking.assignedConsultantId,
        status: "NEW",
      },
    });

    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/bookings");
    return { projectId: project.id };
```

Change to:

```ts
    const project = await db.project.create({
      data: {
        name: `${booking.customerName} — ${booking.vesselName ?? "Project"}`,
        customerId: booking.customerId,
        companyId: booking.companyId,
        vesselId: booking.vesselId,
        serviceId: booking.serviceId,
        bookingId: booking.id,
        consultantId: booking.assignedConsultantId,
        status: "NEW",
      },
    });

    await copyServiceRequiredFormsToProject(project.id, booking.serviceId);

    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/bookings");
    return { projectId: project.id };
```

`booking.serviceId` is a required `String` on `Booking` (not optional), so no null check is needed here (unlike the `createProject` path, where `serviceId` is optional).

- [ ] **Step 4: Add the import**

At the top of `src/app/dashboard/projects/actions.ts`, add to the existing import block:

```ts
import { copyServiceRequiredFormsToProject } from "@/lib/required-forms";
```

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/required-forms.ts src/app/dashboard/projects/actions.ts
git commit -m "feat: copy service default required forms onto new projects"
```

---

### Task 3: Service-side required-forms server actions

**Files:**
- Modify: `src/app/dashboard/services/actions.ts`

**Interfaces:**
- Consumes: `requireRole`, `db`, `revalidatePath` (already imported in this file).
- Produces: `addServiceRequiredForm(serviceId: string, companyDocumentId: string): Promise<void>`, `removeServiceRequiredForm(id: string): Promise<void>`, `toggleServiceRequiredFormRequired(id: string, required: boolean): Promise<void>`, `reorderServiceRequiredForm(id: string, direction: "up" | "down"): Promise<void>` — consumed by Task 4's `required-forms-section.tsx`.

- [ ] **Step 1: Append the new actions**

At the end of `src/app/dashboard/services/actions.ts` (after the existing `toggleServiceActive` function), add:

```ts

// ── Required Forms ──────────────────────────────────────────────────────────

export async function addServiceRequiredForm(serviceId: string, companyDocumentId: string) {
  await requireRole("ADMIN", "MANAGER");

  const maxOrder = await db.serviceRequiredForm.aggregate({
    where: { serviceId },
    _max: { order: true },
  });

  await db.serviceRequiredForm.create({
    data: {
      serviceId,
      companyDocumentId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/dashboard/services");
}

export async function removeServiceRequiredForm(id: string) {
  await requireRole("ADMIN", "MANAGER");
  await db.serviceRequiredForm.delete({ where: { id } });
  revalidatePath("/dashboard/services");
}

export async function toggleServiceRequiredFormRequired(id: string, required: boolean) {
  await requireRole("ADMIN", "MANAGER");
  await db.serviceRequiredForm.update({ where: { id }, data: { required } });
  revalidatePath("/dashboard/services");
}

export async function reorderServiceRequiredForm(id: string, direction: "up" | "down") {
  await requireRole("ADMIN", "MANAGER");

  const current = await db.serviceRequiredForm.findUniqueOrThrow({ where: { id } });
  const neighbor = await db.serviceRequiredForm.findFirst({
    where: {
      serviceId: current.serviceId,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await db.$transaction([
    db.serviceRequiredForm.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    db.serviceRequiredForm.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);

  revalidatePath("/dashboard/services");
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/services/actions.ts
git commit -m "feat: add server actions for service required-forms templates"
```

---

### Task 4: Service edit screen — Required Forms section

**Files:**
- Create: `src/app/dashboard/services/required-forms-section.tsx`
- Modify: `src/app/dashboard/services/service-form-dialog.tsx`
- Modify: `src/app/dashboard/services/services-table.tsx`
- Modify: `src/app/dashboard/services/page.tsx`

**Interfaces:**
- Consumes: `addServiceRequiredForm`, `removeServiceRequiredForm`, `toggleServiceRequiredFormRequired`, `reorderServiceRequiredForm` (Task 3).
- Produces: `RequiredFormRow` type (`{ id: string; companyDocumentId: string; title: string; required: boolean; order: number }`) and `RequiredFormsSection` component, both exported from `required-forms-section.tsx` — consumed by `service-form-dialog.tsx` in this task, and independently redefined (not shared) by Task 6's project-side component since the two rows carry different fields.

- [ ] **Step 1: Create the section component**

`src/app/dashboard/services/required-forms-section.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import {
  addServiceRequiredForm,
  removeServiceRequiredForm,
  reorderServiceRequiredForm,
  toggleServiceRequiredFormRequired,
} from "./actions";

export type RequiredFormRow = {
  id: string;
  companyDocumentId: string;
  title: string;
  required: boolean;
  order: number;
};

export function RequiredFormsSection({
  serviceId,
  requiredForms,
  availableForms,
}: {
  serviceId: string;
  requiredForms: RequiredFormRow[];
  availableForms: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("");

  const assignedIds = new Set(requiredForms.map((form) => form.companyDocumentId));
  const options = availableForms.filter((form) => !assignedIds.has(form.id));
  const sorted = [...requiredForms].sort((a, b) => a.order - b.order);

  function handleAdd() {
    if (!selected) return;
    startTransition(async () => {
      await addServiceRequiredForm(serviceId, selected);
      setSelected("");
      notify.success("Form added");
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeServiceRequiredForm(id);
      notify.success("Form removed");
    });
  }

  function handleToggleRequired(id: string, required: boolean) {
    startTransition(async () => {
      await toggleServiceRequiredFormRequired(id, required);
    });
  }

  function handleReorder(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await reorderServiceRequiredForm(id, direction);
    });
  }

  return (
    <div className="grid gap-2">
      <Label>Required Forms</Label>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No required forms yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {sorted.map((form, index) => (
            <li key={form.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{form.title}</span>
                <Badge
                  variant={form.required ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleToggleRequired(form.id, !form.required)}
                >
                  {form.required ? "Required" : "Optional"}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move up"
                  disabled={isPending || index === 0}
                  onClick={() => handleReorder(form.id, "up")}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move down"
                  disabled={isPending || index === sorted.length - 1}
                  onClick={() => handleReorder(form.id, "down")}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove form"
                  disabled={isPending}
                  onClick={() => handleRemove(form.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {options.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Select a form to add" />
            </SelectTrigger>
            <SelectContent>
              {options.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  {form.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selected || isPending}
            onClick={handleAdd}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `service-form-dialog.tsx`**

In `src/app/dashboard/services/service-form-dialog.tsx`, add the import (after the existing `createService, updateService` import):

```ts
import { RequiredFormsSection, type RequiredFormRow } from "./required-forms-section";
```

Extend `ServiceRecord`:

```ts
type ServiceRecord = {
  id: string;
  name: string;
  categoryId: string;
  parentServiceId: string | null;
  overview: string | null;
  benefits: string | null;
  scope: string | null;
  process: string | null;
  defaultConsultantId: string | null;
  order: number;
  faq: unknown;
  requiredForms: RequiredFormRow[];
};
```

Extend the component's props (both the destructured params and the type annotation):

```ts
export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  categories,
  consultants,
  topLevelServices,
  availableForms,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceRecord;
  categories: { id: string; name: string }[];
  consultants: { id: string; name: string }[];
  topLevelServices: { id: string; name: string }[];
  availableForms: { id: string; title: string }[];
}) {
```

Render the section — insert it right after the FAQ block (after the `<input type="hidden" name="faq" ... />` line) and before the `{error && ...}` line:

```tsx
          <input type="hidden" name="faq" value={JSON.stringify(faqItems)} readOnly />

          {service && (
            <RequiredFormsSection
              serviceId={service.id}
              requiredForms={service.requiredForms}
              availableForms={availableForms}
            />
          )}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
```

- [ ] **Step 3: Thread `availableForms` and `requiredForms` through `services-table.tsx`**

In `src/app/dashboard/services/services-table.tsx`, add the import:

```ts
import { type RequiredFormRow } from "./required-forms-section";
```

Extend `ServiceRow`:

```ts
type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  parentServiceId: string | null;
  overview: string | null;
  benefits: string | null;
  scope: string | null;
  process: string | null;
  defaultConsultantId: string | null;
  defaultConsultantName: string | null;
  order: number;
  isActive: boolean;
  faq: unknown;
  requiredForms: RequiredFormRow[];
};
```

Extend `ServicesTable`'s props:

```ts
export function ServicesTable({
  services,
  categories,
  consultants,
  canManage,
  availableForms,
}: {
  services: ServiceRow[];
  categories: { id: string; name: string }[];
  consultants: { id: string; name: string }[];
  canManage: boolean;
  availableForms: { id: string; title: string }[];
}) {
```

Pass it to the dialog. Change:

```tsx
      <ServiceFormDialog
        key={dialog.service?.id ?? "new"}
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        service={dialog.service}
        categories={categories}
        consultants={consultants}
        topLevelServices={topLevel
          .filter((service) => service.isActive)
          .map((service) => ({ id: service.id, name: service.name }))}
      />
```

to:

```tsx
      <ServiceFormDialog
        key={dialog.service?.id ?? "new"}
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        service={dialog.service}
        categories={categories}
        consultants={consultants}
        topLevelServices={topLevel
          .filter((service) => service.isActive)
          .map((service) => ({ id: service.id, name: service.name }))}
        availableForms={availableForms}
      />
```

- [ ] **Step 4: Fetch and pass the data in `page.tsx`**

In `src/app/dashboard/services/page.tsx`, change the `Promise.all` to also fetch `requiredForms` on each service and the pool of FORM-category `CompanyDocument` rows:

```tsx
  const [categories, services, consultants, requests, forms] = await Promise.all([
    db.serviceCategory.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { services: true } } },
    }),
    db.service.findMany({
      orderBy: { order: "asc" },
      include: {
        category: true,
        defaultConsultant: true,
        requiredForms: { include: { companyDocument: true }, orderBy: { order: "asc" } },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { service: true },
    }),
    db.companyDocument.findMany({
      where: { category: "FORM" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);
```

Update the `<ServicesTable>` call to pass `availableForms` and map `requiredForms` on each service:

```tsx
      <ServicesTable
        canManage={canManage}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        consultants={consultants}
        availableForms={forms}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          slug: service.slug,
          categoryId: service.categoryId,
          categoryName: service.category.name,
          parentServiceId: service.parentServiceId,
          overview: service.overview,
          benefits: service.benefits,
          scope: service.scope,
          process: service.process,
          defaultConsultantId: service.defaultConsultantId,
          defaultConsultantName: service.defaultConsultant?.name ?? null,
          order: service.order,
          isActive: service.isActive,
          faq: service.faq,
          requiredForms: service.requiredForms.map((form) => ({
            id: form.id,
            companyDocumentId: form.companyDocumentId,
            title: form.companyDocument.title,
            required: form.required,
            order: form.order,
          })),
        }))}
      />
```

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/services/required-forms-section.tsx src/app/dashboard/services/service-form-dialog.tsx src/app/dashboard/services/services-table.tsx src/app/dashboard/services/page.tsx
git commit -m "feat: add Required Forms section to the Service edit dialog"
```

---

### Task 5: Project-side required-forms server actions

**Files:**
- Modify: `src/app/dashboard/projects/actions.ts`

**Interfaces:**
- Consumes: `PROJECT_ROLES`, `requireRole`, `db`, `revalidatePath` (already in this file, plus Task 2's edits already present).
- Produces: `addProjectRequiredForm(projectId: string, companyDocumentId: string): Promise<void>`, `removeProjectRequiredForm(projectId: string, id: string): Promise<void>`, `toggleProjectRequiredFormRequired(projectId: string, id: string, required: boolean): Promise<void>`, `toggleProjectRequiredFormCompleted(projectId: string, id: string, completed: boolean): Promise<void>`, `reorderProjectRequiredForm(projectId: string, id: string, direction: "up" | "down"): Promise<void>` — consumed by Task 6's `required-forms-section.tsx`. `projectId` is threaded through every action (unlike the service-side actions) because `revalidatePath` needs the dynamic `/dashboard/projects/${projectId}` route, matching the existing `uploadProjectDocument(projectId, ...)` convention in this same file.

- [ ] **Step 1: Append the new actions**

At the end of `src/app/dashboard/projects/actions.ts` (after `uploadProjectDocument`), add:

```ts

// ── Required Forms ──────────────────────────────────────────────────────────

export async function addProjectRequiredForm(projectId: string, companyDocumentId: string) {
  await requireRole(...PROJECT_ROLES);

  const maxOrder = await db.projectRequiredForm.aggregate({
    where: { projectId },
    _max: { order: true },
  });

  await db.projectRequiredForm.create({
    data: {
      projectId,
      companyDocumentId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function removeProjectRequiredForm(projectId: string, id: string) {
  await requireRole(...PROJECT_ROLES);
  await db.projectRequiredForm.delete({ where: { id } });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function toggleProjectRequiredFormRequired(
  projectId: string,
  id: string,
  required: boolean,
) {
  await requireRole(...PROJECT_ROLES);
  await db.projectRequiredForm.update({ where: { id }, data: { required } });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function toggleProjectRequiredFormCompleted(
  projectId: string,
  id: string,
  completed: boolean,
) {
  await requireRole(...PROJECT_ROLES);
  await db.projectRequiredForm.update({
    where: { id },
    data: { completed, completedAt: completed ? new Date() : null },
  });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function reorderProjectRequiredForm(
  projectId: string,
  id: string,
  direction: "up" | "down",
) {
  await requireRole(...PROJECT_ROLES);

  const current = await db.projectRequiredForm.findUniqueOrThrow({ where: { id } });
  const neighbor = await db.projectRequiredForm.findFirst({
    where: {
      projectId: current.projectId,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await db.$transaction([
    db.projectRequiredForm.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    db.projectRequiredForm.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);

  revalidatePath(`/dashboard/projects/${projectId}`);
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/projects/actions.ts
git commit -m "feat: add server actions for project required-forms checklist"
```

---

### Task 6: Project detail page — Required Forms section

**Files:**
- Create: `src/app/dashboard/projects/[id]/required-forms-section.tsx`
- Modify: `src/app/dashboard/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `addProjectRequiredForm`, `removeProjectRequiredForm`, `toggleProjectRequiredFormRequired`, `toggleProjectRequiredFormCompleted`, `reorderProjectRequiredForm` (Task 5).
- Produces: `RequiredFormsSection` component (default export style matches `DocumentsSection`/`SchedulesSection` — named export), consumed only by `page.tsx` in this task.

- [ ] **Step 1: Create the section component**

`src/app/dashboard/projects/[id]/required-forms-section.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, FileText, Plus, Trash2 } from "lucide-react";
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
import { EmptyState } from "@/components/shared/empty-state";
import {
  addProjectRequiredForm,
  removeProjectRequiredForm,
  reorderProjectRequiredForm,
  toggleProjectRequiredFormCompleted,
  toggleProjectRequiredFormRequired,
} from "../actions";

type RequiredFormRow = {
  id: string;
  companyDocumentId: string;
  title: string;
  url: string;
  required: boolean;
  completed: boolean;
  order: number;
};

export function RequiredFormsSection({
  projectId,
  requiredForms,
  availableForms,
  canManage,
}: {
  projectId: string;
  requiredForms: RequiredFormRow[];
  availableForms: { id: string; title: string }[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("");

  const assignedIds = new Set(requiredForms.map((form) => form.companyDocumentId));
  const options = availableForms.filter((form) => !assignedIds.has(form.id));
  const sorted = [...requiredForms].sort((a, b) => a.order - b.order);

  function handleAdd() {
    if (!selected) return;
    startTransition(async () => {
      await addProjectRequiredForm(projectId, selected);
      setSelected("");
      notify.success("Form added");
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeProjectRequiredForm(projectId, id);
      notify.success("Form removed");
    });
  }

  function handleToggleRequired(id: string, required: boolean) {
    startTransition(async () => {
      await toggleProjectRequiredFormRequired(projectId, id, required);
    });
  }

  function handleToggleCompleted(id: string, completed: boolean) {
    startTransition(async () => {
      await toggleProjectRequiredFormCompleted(projectId, id, completed);
    });
  }

  function handleReorder(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await reorderProjectRequiredForm(projectId, id, direction);
    });
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="p-4">
        <h2 className="font-heading text-base font-semibold">Required Forms</h2>
        <p className="text-sm text-muted-foreground">
          Forms and paperwork needed to complete this project.
        </p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState className="border-none" title="No required forms yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sorted.map((form, index) => (
            <li key={form.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                {canManage ? (
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={form.completed}
                    disabled={isPending}
                    onChange={(event) => handleToggleCompleted(form.id, event.target.checked)}
                    aria-label={`Mark ${form.title} completed`}
                  />
                ) : (
                  <Badge variant={form.completed ? "success" : "outline"}>
                    {form.completed ? "Done" : "Pending"}
                  </Badge>
                )}
                <a
                  href={form.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:underline"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{form.title}</span>
                </a>
                <Badge
                  variant={form.required ? "default" : "outline"}
                  className={canManage ? "cursor-pointer" : undefined}
                  onClick={
                    canManage ? () => handleToggleRequired(form.id, !form.required) : undefined
                  }
                >
                  {form.required ? "Required" : "Optional"}
                </Badge>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move up"
                    disabled={isPending || index === 0}
                    onClick={() => handleReorder(form.id, "up")}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move down"
                    disabled={isPending || index === sorted.length - 1}
                    onClick={() => handleReorder(form.id, "down")}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove form"
                    disabled={isPending}
                    onClick={() => handleRemove(form.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && options.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-4 pt-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger size="sm" className="w-[220px]">
              <SelectValue placeholder="Select a form to add" />
            </SelectTrigger>
            <SelectContent>
              {options.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  {form.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" disabled={!selected || isPending} onClick={handleAdd}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `page.tsx`**

In `src/app/dashboard/projects/[id]/page.tsx`, add the import (after the `SchedulesSection` import):

```ts
import { RequiredFormsSection } from "./required-forms-section";
```

Change the data-fetching `Promise.all` from:

```tsx
  const [project, customers, vessels, consultants] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        customer: true,
        vessel: true,
        service: true,
        consultant: true,
        booking: true,
        documents: { orderBy: { createdAt: "desc" } },
        schedules: { orderBy: { startAt: "asc" }, include: { consultant: true } },
      },
    }),
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.vessel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
```

to:

```tsx
  const [project, customers, vessels, consultants, forms] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        customer: true,
        vessel: true,
        service: true,
        consultant: true,
        booking: true,
        documents: { orderBy: { createdAt: "desc" } },
        schedules: { orderBy: { startAt: "asc" }, include: { consultant: true } },
        requiredForms: { orderBy: { order: "asc" }, include: { companyDocument: true } },
      },
    }),
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.vessel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.companyDocument.findMany({
      where: { category: "FORM" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);
```

Insert `<RequiredFormsSection>` between `<SchedulesSection>` and `<DocumentsSection>`. Change:

```tsx
      <SchedulesSection
        projectId={project.id}
        projectName={project.name}
        consultantId={project.consultantId}
        consultants={consultants}
        canManage={canManage}
        schedules={project.schedules.map((schedule) => ({
          id: schedule.id,
          title: schedule.title,
          type: schedule.type,
          startAt: schedule.startAt.toISOString(),
          endAt: schedule.endAt.toISOString(),
          consultantName: schedule.consultant.name,
        }))}
      />

      <DocumentsSection
```

to:

```tsx
      <SchedulesSection
        projectId={project.id}
        projectName={project.name}
        consultantId={project.consultantId}
        consultants={consultants}
        canManage={canManage}
        schedules={project.schedules.map((schedule) => ({
          id: schedule.id,
          title: schedule.title,
          type: schedule.type,
          startAt: schedule.startAt.toISOString(),
          endAt: schedule.endAt.toISOString(),
          consultantName: schedule.consultant.name,
        }))}
      />

      <RequiredFormsSection
        projectId={project.id}
        canManage={canManage}
        availableForms={forms}
        requiredForms={project.requiredForms.map((form) => ({
          id: form.id,
          companyDocumentId: form.companyDocumentId,
          title: form.companyDocument.title,
          url: form.companyDocument.url,
          required: form.required,
          completed: form.completed,
          order: form.order,
        }))}
      />

      <DocumentsSection
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/projects/[id]/required-forms-section.tsx "src/app/dashboard/projects/[id]/page.tsx"
git commit -m "feat: add Required Forms checklist section to the project detail page"
```

---

### Task 7: Full verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Typecheck, lint, build**

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all three exit 0.

- [ ] **Step 2: Manual browser verification — Service template**

Sign in as ADMIN or MANAGER, open `/dashboard/services`, edit an existing service:
- Confirm the "Required Forms" section is visible (edit mode only — creating a *new* service should show no such section).
- Add 2-3 forms (mix of Required Yes/No), reorder them with the up/down buttons, remove one.
- Reload the page and confirm the list, required flags, and order all persisted.

- [ ] **Step 3: Manual browser verification — copy-on-create**

- Create a new Project against the service configured in Step 2. Open the project detail page and confirm the Required Forms section shows the same forms, same required flags, same order, all unchecked.
- Accept a Booking whose service has default forms and convert it to a Project (via the existing booking-to-project flow). Confirm the same copy behavior.

- [ ] **Step 4: Manual browser verification — project-level independence**

On a project's Required Forms section:
- Toggle one form's completion checkbox, reload, confirm it persisted.
- Toggle a form's Required badge, reload the *Service* edit dialog, confirm the service's template is unchanged.
- Remove a form from the project, reload the Service, confirm it's still in the service's template.
- Add a form directly to the project that isn't in the service's defaults, confirm it appears only on that project.

- [ ] **Step 5: Manual browser verification — empty states and edge cases**

- Open a project with no `serviceId` (or whose service has no default forms). Confirm the Required Forms section still renders with its empty state, and an ADMIN/MANAGER/STAFF user can still add a form manually via "Add Form".
- As a non-manage role (e.g. FINANCE_OFFICER) on a project, confirm the section renders read-only (Done/Pending badges instead of checkboxes, no reorder/remove/add controls).
- Delete a `CompanyDocument` (Form) from `/dashboard/documents` that's currently assigned to a service and a project. Confirm both the Service and Project pages load without errors afterward (cascade removed the assignment rows).

- [ ] **Step 6: Commit if any fixes were needed**

If verification surfaced any issues, fix them and commit:

```bash
git add -A
git commit -m "fix: address issues found during required-forms verification"
```

If no issues, no commit needed for this task.

---

## Self-Review

**Spec coverage:**
- §1 Schema — Task 1.
- §2 Copy-on-create (including the "no auto-resync on service change" decision, which is preserved by design — nothing in Task 5/6 ever calls `copyServiceRequiredFormsToProject` again after creation) — Task 2.
- §3 Service edit screen section, edit-mode-only gating, RBAC — Task 3 + Task 4.
- §4 Project detail page section, always-renders behavior, RBAC, completion checkbox — Task 5 + Task 6.
- §5 Out of scope — no task builds any of the excluded items (usage-count UI, notifications, bulk-copy, auto-resync).
- Testing section — Task 7 covers every listed scenario.

**Placeholder scan:** No TBD/TODO markers; every step has complete, runnable code; no "similar to Task N" references.

**Type consistency:** `RequiredFormRow` (service-side, in `required-forms-section.tsx`) has fields `{id, companyDocumentId, title, required, order}`; the project-side `RequiredFormRow` (locally defined in the project's `required-forms-section.tsx`, not exported/shared, since its shape differs) adds `url` and `completed`. `direction: "up" | "down"` is consistent across `reorderServiceRequiredForm` (Task 3) and `reorderProjectRequiredForm` (Task 5) and their respective UI callers. `addProjectRequiredForm`/`removeProjectRequiredForm`/`toggleProjectRequiredFormRequired`/`toggleProjectRequiredFormCompleted`/`reorderProjectRequiredForm` all take `projectId` first, matching every call site in Task 6's component.
