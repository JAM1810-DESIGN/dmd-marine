# Service Catalog Reorg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the "Third Party Hold Inspection" service to "Develop Vessel-Specific Draft Survey Form", make a new "Third Party Hold Inspection" a real submodule (child) of "Vessel Condition Inspection", and soft-delete "Competency Training", "Document Review", "Expert Advisory" — across the admin dashboard and public site, backed by a `parentServiceId` self-relation on `Service`.

**Architecture:** Single Next.js app, Postgres via Prisma. All service names are DB rows (`Service` under `ServiceCategory`), rendered by generic, DB-driven pages — there is no per-service hardcoded UI. Add a nullable self-relation (`parentServiceId`/`parent`/`children`) to `Service` for one level of nesting, then thread it through the admin CRUD, the public services listing/detail pages, and the booking form's service picker. Data changes (rename/insert/soft-delete) ship as a one-off idempotent script using Prisma Client, run once per environment — not raw SQL, because `Service.id` has no DB-level default (Prisma-side `cuid()` only).

**Tech Stack:** Next.js 16 (App Router, Server Components/Actions), Prisma 7 + `@prisma/adapter-pg`, Zod, `tsx` for one-off scripts.

## Global Constraints

- No separate mobile app exists — this is one responsive Next.js app; do not create mobile-specific files.
- Rename is in-place on the existing `Service` row (same `id`), not a new row.
- Removal of unused services is a soft delete (`isActive = false`), never a hard delete.
- Nesting is exactly one level deep (a top-level service has children; a child cannot itself have children). Enforce this server-side, not just in the UI.
- No raw-SQL data migration for the new row — `Service.id` has no DB default, so the insert must go through Prisma Client (a script), matching `prisma/seed.ts`'s existing pattern.
- This project has no automated test runner (no jest/vitest/playwright in `package.json`) — verification steps use `pnpm typecheck`, `pnpm lint`, `pnpm build`, direct DB checks via `tsx`, and manual browser checks against `pnpm dev` instead of `pytest`/`jest`-style unit tests. Follow this existing convention; do not introduce a new test framework as part of this plan.

---

### Task 1: Add `parentServiceId` self-relation to `Service`

**Files:**
- Modify: `prisma/schema.prisma:298-324` (the `Service` model)
- Create: `prisma/migrations/<timestamp>_add_service_parent_relation/migration.sql` (generated, not hand-written)

**Interfaces:**
- Produces: `Service.parentServiceId: string | null`, `Service.parent: Service | null` (relation, not selected by default), `Service.children: Service[]` (relation, not selected by default). Every later task that queries `Service` and needs hierarchy must explicitly `include`/`select` `parent`/`children`.

- [ ] **Step 1: Edit the `Service` model**

In `prisma/schema.prisma`, inside `model Service { ... }`, add the new scalar field near the other scalars and the relation fields near the other relations:

```prisma
model Service {
  id                  String  @id @default(cuid())
  categoryId          String
  parentServiceId     String?
  name                String
  slug                String  @unique
  overview            String?
  benefits            String?
  scope               String?
  process             String?
  faq                 Json?
  defaultConsultantId String?
  isActive            Boolean @default(true)
  order               Int     @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  category          ServiceCategory @relation(fields: [categoryId], references: [id])
  parent            Service?        @relation("ServiceHierarchy", fields: [parentServiceId], references: [id], onDelete: SetNull)
  children          Service[]       @relation("ServiceHierarchy")
  defaultConsultant User?           @relation("ServiceDefaultConsultant", fields: [defaultConsultantId], references: [id], onDelete: SetNull)
  bookings          Booking[]
  projects          Project[]
  invoices          Invoice[]
  invoiceItems      InvoiceItem[]

  @@index([categoryId])
  @@index([parentServiceId])
  @@map("services")
}
```

Only additions: `parentServiceId String?`, the `parent`/`children` relation lines, and `@@index([parentServiceId])`.

- [ ] **Step 2: Generate and apply the migration**

Run:
```bash
pnpm prisma migrate dev --name add_service_parent_relation
```
Expected: Prisma prints `Your database is now in sync with your schema` and creates `prisma/migrations/<timestamp>_add_service_parent_relation/migration.sql` containing an `ALTER TABLE "services" ADD COLUMN "parentServiceId" TEXT` plus the FK and index. It also regenerates the Prisma Client (`src/generated/prisma`).

- [ ] **Step 3: Verify**

Run:
```bash
pnpm prisma migrate status
pnpm typecheck
```
Expected: both clean — `Database schema is up to date!` and no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add parentServiceId self-relation to Service for one-level submodules"
```

---

### Task 2: Data migration script (rename, submodule insert, soft-delete)

**Files:**
- Create: `scripts/migrate-service-catalog.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/db` (Task 1's regenerated client, which now has `parentServiceId` on `Service`).
- Produces: nothing consumed by later tasks — this is a one-off operational script, run manually, not imported anywhere.

- [ ] **Step 1: Write the script**

```ts
// One-off, idempotent. Run once per environment:
//   tsx --env-file=.env scripts/migrate-service-catalog.ts
//
// 1. Renames the existing "Third Party Hold Inspection" service (in place,
//    same id) to "Develop Vessel-Specific Draft Survey Form".
// 2. Re-creates "Third Party Hold Inspection" as a child of
//    "Vessel Condition Inspection", reusing the slug the rename freed up.
// 3. Soft-deletes Competency Training, Document Review, Expert Advisory.
import { db } from "../src/lib/db";

async function renameThirdPartyHoldInspection() {
  const oldTopLevel = await db.service.findFirst({
    where: { slug: "third-party-hold-inspection", parentServiceId: null },
  });

  if (!oldTopLevel) {
    console.log("Skip rename: no top-level 'third-party-hold-inspection' service found.");
    return;
  }

  await db.service.update({
    where: { id: oldTopLevel.id },
    data: {
      name: "Develop Vessel-Specific Draft Survey Form",
      slug: "develop-vessel-specific-draft-survey-form",
    },
  });
  console.log(`Renamed service ${oldTopLevel.id} to "Develop Vessel-Specific Draft Survey Form".`);
}

async function createThirdPartyHoldInspectionSubmodule() {
  const vesselCondition = await db.service.findFirst({
    where: { slug: "vessel-condition-inspection" },
  });

  if (!vesselCondition) {
    console.log("Skip submodule create: 'vessel-condition-inspection' service not found.");
    return;
  }

  const service = await db.service.upsert({
    where: { slug: "third-party-hold-inspection" },
    update: { parentServiceId: vesselCondition.id, categoryId: vesselCondition.categoryId },
    create: {
      name: "Third Party Hold Inspection",
      slug: "third-party-hold-inspection",
      categoryId: vesselCondition.categoryId,
      parentServiceId: vesselCondition.id,
    },
  });
  console.log(`Third Party Hold Inspection submodule ready: ${service.id} (parent ${vesselCondition.id}).`);
}

async function softDeleteUnusedServices() {
  const result = await db.service.updateMany({
    where: {
      slug: { in: ["competency-training", "document-review", "expert-advisory"] },
      isActive: true,
    },
    data: { isActive: false },
  });
  console.log(`Soft-deleted ${result.count} unused service(s).`);
}

async function main() {
  await renameThirdPartyHoldInspection();
  await createThirdPartyHoldInspectionSubmodule();
  await softDeleteUnusedServices();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
```

- [ ] **Step 2: Run it against the local dev DB**

```bash
tsx --env-file=.env scripts/migrate-service-catalog.ts
```
Expected output (order may vary slightly):
```
Renamed service <id> to "Develop Vessel-Specific Draft Survey Form".
Third Party Hold Inspection submodule ready: <id> (parent <id>).
Soft-deleted 3 unused service(s).
```

- [ ] **Step 3: Re-run to verify idempotency**

```bash
tsx --env-file=.env scripts/migrate-service-catalog.ts
```
Expected output:
```
Skip rename: no top-level 'third-party-hold-inspection' service found.
Third Party Hold Inspection submodule ready: <id> (parent <id>).
Soft-deleted 0 unused service(s).
```
(The second line still prints "ready" because `upsert` matches the now-existing child by slug and updates it — that's correct, not a bug.)

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-service-catalog.ts
git commit -m "feat: add one-off data migration script for service catalog reorg"
```

---

### Task 3: Validation + server actions accept `parentServiceId`

**Files:**
- Modify: `src/lib/validations/service.ts`
- Modify: `src/app/dashboard/services/actions.ts:89-160` (`createService`, `updateService`)

**Interfaces:**
- Consumes: `db` from `@/lib/db`, `AppError`-throwing `requireRole` from `@/lib/rbac` (existing).
- Produces: `serviceSchema` now parses `parentServiceId: string | null`; `createService`/`updateService` persist it, rejecting self-parenting and depth > 1.

- [ ] **Step 1: Add `parentServiceId` to the schema**

In `src/lib/validations/service.ts`, add to `serviceSchema` (same optional-empty-means-null pattern already used for `defaultConsultantId`):

```ts
export const serviceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  categoryId: z.string().min(1, "Please select a category"),
  parentServiceId: z
    .string()
    .optional()
    .transform((value) => (value && value !== "none" ? value : null)),
  overview: z.string().optional(),
  benefits: z.string().optional(),
  scope: z.string().optional(),
  process: z.string().optional(),
  defaultConsultantId: z
    .string()
    .optional()
    .transform((value) => (value && value !== "none" ? value : null)),
  order: z.coerce.number().int().default(0),
  faq: z.array(faqItemSchema).default([]),
});
```

- [ ] **Step 2: Wire it through `createService`**

In `src/app/dashboard/services/actions.ts`, add `parentServiceId: formData.get("parentServiceId") || undefined,` to the `serviceSchema.safeParse({...})` call inside `createService` (alongside the existing `categoryId`/`defaultConsultantId` fields). No extra validation needed on create — a brand-new service can't yet be anyone's ancestor, so the only invariant (no depth > 1) is enforced by the picker only ever offering top-level services (Task 4); still, guard server-side in case the field is tampered with:

```ts
export async function createService(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER");

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    parentServiceId: formData.get("parentServiceId") || undefined,
    overview: formData.get("overview") || undefined,
    benefits: formData.get("benefits") || undefined,
    scope: formData.get("scope") || undefined,
    process: formData.get("process") || undefined,
    defaultConsultantId: formData.get("defaultConsultantId") || undefined,
    order: formData.get("order") || 0,
    faq: parseFaq(formData.get("faq")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  if (parsed.data.parentServiceId) {
    const parent = await db.service.findUnique({
      where: { id: parsed.data.parentServiceId },
      select: { parentServiceId: true },
    });
    if (!parent || parent.parentServiceId) {
      return { error: "Parent service must be a top-level service." };
    }
  }

  const slug = await uniqueSlug(
    parsed.data.name,
    async (candidate) => (await db.service.count({ where: { slug: candidate } })) > 0,
  );

  const { faq, ...rest } = parsed.data;

  try {
    await db.service.create({
      data: { ...rest, slug, faq: faq as unknown as Prisma.InputJsonValue },
    });
  } catch {
    return { error: "Could not create the service. Please try again." };
  }

  revalidatePath("/dashboard/services");
  return { success: true };
}
```

- [ ] **Step 3: Wire it through `updateService`**

Same `parentServiceId` field added to the `safeParse` call, plus a self-reference guard (an existing service can't become its own parent) on top of the depth guard:

```ts
export async function updateService(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN", "MANAGER");

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    parentServiceId: formData.get("parentServiceId") || undefined,
    overview: formData.get("overview") || undefined,
    benefits: formData.get("benefits") || undefined,
    scope: formData.get("scope") || undefined,
    process: formData.get("process") || undefined,
    defaultConsultantId: formData.get("defaultConsultantId") || undefined,
    order: formData.get("order") || 0,
    faq: parseFaq(formData.get("faq")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  if (parsed.data.parentServiceId) {
    if (parsed.data.parentServiceId === id) {
      return { error: "A service cannot be its own parent." };
    }
    const parent = await db.service.findUnique({
      where: { id: parsed.data.parentServiceId },
      select: { parentServiceId: true },
    });
    if (!parent || parent.parentServiceId) {
      return { error: "Parent service must be a top-level service." };
    }
  }

  const { faq, ...rest } = parsed.data;

  await db.service.update({
    where: { id },
    data: { ...rest, faq: faq as unknown as Prisma.InputJsonValue },
  });

  revalidatePath("/dashboard/services");
  return { success: true };
}
```

- [ ] **Step 4: Verify**

```bash
pnpm typecheck
```
Expected: no errors (no UI wired to the new field yet — Task 4 does that — but the schema and actions must already compile).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/service.ts src/app/dashboard/services/actions.ts
git commit -m "feat: accept and validate parentServiceId in service create/update actions"
```

---

### Task 4: Admin dashboard — parent picker + nested table

**Files:**
- Modify: `src/app/dashboard/services/page.tsx`
- Modify: `src/app/dashboard/services/service-form-dialog.tsx`
- Modify: `src/app/dashboard/services/services-table.tsx`

**Interfaces:**
- Consumes: `parentServiceId` on `serviceSchema`/`createService`/`updateService` (Task 3).
- Produces: `ServiceFormDialog` accepts a new `topLevelServices` prop; `ServicesTable`'s `ServiceRow` type gains `parentServiceId: string | null`.

- [ ] **Step 1: Pass `parentServiceId` and a top-level list from the page**

In `src/app/dashboard/services/page.tsx`, add `parentServiceId: service.parentServiceId` to the `services.map(...)` passed to `ServicesTable`, and pass a `topLevelServices` prop to `ServicesTable` (it forwards it to the form dialog):

```tsx
      <ServicesTable
        canManage={canManage}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        consultants={consultants}
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
        }))}
      />
```

No other change needed in `page.tsx` — `ServicesTable` derives the top-level list from `services` itself in Step 3 below (avoids a second DB query).

- [ ] **Step 2: Add the "Parent Service" select to `ServiceFormDialog`**

In `src/app/dashboard/services/service-form-dialog.tsx`, extend `ServiceRecord` and the component props, and render the select. Full updated file:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { isFaqArray, type FaqItem } from "@/lib/faq";
import { createService, updateService } from "./actions";

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
};

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  categories,
  consultants,
  topLevelServices,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceRecord;
  categories: { id: string; name: string }[];
  consultants: { id: string; name: string }[];
  topLevelServices: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  // Reset via the `key` prop on the parent (per service id / "new"), not an effect.
  const [faqItems, setFaqItems] = useState<FaqItem[]>(() =>
    isFaqArray(service?.faq) ? service.faq : [],
  );

  const parentOptions = topLevelServices.filter((option) => option.id !== service?.id);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = service
        ? await updateService(service.id, {}, formData)
        : await createService({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      notify.success(service ? "Service updated" : "Service created");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "New Service"}</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={service?.name} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <Select name="categoryId" defaultValue={service?.categoryId} required>
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="parentServiceId">Parent Service</Label>
            <Select name="parentServiceId" defaultValue={service?.parentServiceId ?? "none"}>
              <SelectTrigger id="parentServiceId" className="w-full">
                <SelectValue placeholder="None (top-level service)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top-level service)</SelectItem>
                {parentOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="overview">Overview</Label>
            <Textarea id="overview" name="overview" defaultValue={service?.overview ?? ""} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="benefits">Benefits</Label>
            <Textarea id="benefits" name="benefits" defaultValue={service?.benefits ?? ""} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="scope">Scope</Label>
            <Textarea id="scope" name="scope" defaultValue={service?.scope ?? ""} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="process">Process</Label>
            <Textarea id="process" name="process" defaultValue={service?.process ?? ""} rows={3} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="defaultConsultantId">Default Consultant</Label>
              <Select name="defaultConsultantId" defaultValue={service?.defaultConsultantId ?? "none"}>
                <SelectTrigger id="defaultConsultantId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {consultants.map((consultant) => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      {consultant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="order">Display Order</Label>
              <Input id="order" name="order" type="number" defaultValue={service?.order ?? 0} />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>FAQ</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFaqItems((items) => [...items, { question: "", answer: "" }])}
              >
                <Plus className="size-4" />
                Add Question
              </Button>
            </div>

            {faqItems.map((item, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-start gap-2">
                  <Input
                    placeholder="Question"
                    value={item.question}
                    onChange={(event) =>
                      setFaqItems((items) =>
                        items.map((it, i) =>
                          i === index ? { ...it, question: event.target.value } : it,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove question"
                    onClick={() => setFaqItems((items) => items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Answer"
                  rows={2}
                  value={item.answer}
                  onChange={(event) =>
                    setFaqItems((items) =>
                      items.map((it, i) => (i === index ? { ...it, answer: event.target.value } : it)),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <input type="hidden" name="faq" value={JSON.stringify(faqItems)} readOnly />

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

Note: `parentOptions` filters `topLevelServices` (which the parent already restricts to services with no `parentServiceId` — Step 3) by excluding the service currently being edited, so a service can never be offered as its own parent. Because nesting is exactly one level, there's no deeper descendant-exclusion needed — a child never appears in `topLevelServices` in the first place.

- [ ] **Step 3: Nest children in `ServicesTable`, pass `topLevelServices` down**

Full updated file for `src/app/dashboard/services/services-table.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { toggleServiceActive } from "./actions";
import { ServiceFormDialog } from "./service-form-dialog";

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
};

function ActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          await toggleServiceActive(id, checked);
          notify.success(checked ? "Service activated" : "Service disabled");
        });
      }}
    />
  );
}

function ServiceTableRow({
  service,
  canManage,
  indent,
  onEdit,
}: {
  service: ServiceRow;
  canManage: boolean;
  indent: boolean;
  onEdit: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className={`font-medium text-foreground ${indent ? "pl-6" : ""}`}>
          {indent ? "↳ " : ""}
          {service.name}
        </div>
        <div className={`text-xs text-muted-foreground ${indent ? "pl-6" : ""}`}>
          /{service.slug}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{service.categoryName}</Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {service.defaultConsultantName ?? "—"}
      </TableCell>
      <TableCell>
        {canManage ? (
          <ActiveToggle id={service.id} isActive={service.isActive} />
        ) : (
          <Badge variant={service.isActive ? "default" : "outline"}>
            {service.isActive ? "Active" : "Disabled"}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {canManage && (
          <Button variant="ghost" size="icon-sm" aria-label="Edit service" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ServicesTable({
  services,
  categories,
  consultants,
  canManage,
}: {
  services: ServiceRow[];
  categories: { id: string; name: string }[];
  consultants: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [dialog, setDialog] = useState<{ open: boolean; service?: ServiceRow }>({
    open: false,
    service: undefined,
  });

  const topLevel = services.filter((service) => !service.parentServiceId);
  const childrenByParent = new Map<string, ServiceRow[]>();
  for (const service of services) {
    if (!service.parentServiceId) continue;
    const siblings = childrenByParent.get(service.parentServiceId) ?? [];
    siblings.push(service);
    childrenByParent.set(service.parentServiceId, siblings);
  }

  const orderedRows: { service: ServiceRow; indent: boolean }[] = [];
  for (const parent of topLevel) {
    orderedRows.push({ service: parent, indent: false });
    for (const child of childrenByParent.get(parent.id) ?? []) {
      orderedRows.push({ service: child, indent: true });
    }
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="font-heading text-base font-semibold">Services</h2>
          <p className="text-sm text-muted-foreground">
            Manage the service catalog shown on the website and in bookings.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setDialog({ open: true, service: undefined })}>
            <Plus className="size-4" />
            New Service
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Consultant</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {orderedRows.map(({ service, indent }) => (
            <ServiceTableRow
              key={service.id}
              service={service}
              canManage={canManage}
              indent={indent}
              onEdit={() => setDialog({ open: true, service })}
            />
          ))}
        </TableBody>
      </Table>

      <ServiceFormDialog
        key={dialog.service?.id ?? "new"}
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        service={dialog.service}
        categories={categories}
        consultants={consultants}
        topLevelServices={topLevel.map((service) => ({ id: service.id, name: service.name }))}
      />
    </div>
  );
}
```

`topLevel` is derived from the same `services` prop already passed in — no new DB query, no new prop needed on `page.tsx` beyond the `parentServiceId` field added in Step 1.

- [ ] **Step 4: Verify**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean.

- [ ] **Step 5: Manual check**

```bash
pnpm dev
```
Sign in as the dev admin (`admin@dmdmarine.dev` / `DevAdmin123!` per `prisma/seed.ts`), open `/dashboard/services`. Expected: "Third Party Hold Inspection" row appears indented directly under "Vessel Condition Inspection" (after Task 2's script has run); editing it shows "Vessel Condition Inspection" pre-selected in the new Parent Service field; the parent picker's options list only contains top-level services.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/services/page.tsx src/app/dashboard/services/service-form-dialog.tsx src/app/dashboard/services/services-table.tsx
git commit -m "feat: add parent service picker and nested display to admin services table"
```

---

### Task 5: Public services listing nests children under their parent card

**Files:**
- Modify: `src/app/(marketing)/services/page.tsx`

**Interfaces:**
- Consumes: `Service.parent`/`Service.children` relations (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update the query and card rendering**

Full updated file:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { Section } from "@/components/marketing/section";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Marine consultancy, survey, inspection, compliance, navigation, training, remote support, incident, and port services from DMD Marine.",
};

export default async function ServicesPage() {
  const categories = await db.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      services: {
        where: { isActive: true, parentServiceId: null },
        orderBy: { order: "asc" },
        include: {
          children: { where: { isActive: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });

  return (
    <>
      <Section containerClassName="max-w-3xl text-center">
        <span className="text-xs font-semibold tracking-wide text-accent uppercase">
          What We Do
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Our Services
        </h1>
        <p className="mt-4 text-muted-foreground">
          A full range of marine consultancy, survey, compliance, and support
          services — delivered to international standards.
        </p>
      </Section>

      {categories.map((category, index) => (
        <Section
          key={category.id}
          id={category.slug}
          className={index % 2 === 1 ? "bg-secondary/30" : undefined}
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {category.name}
          </h2>
          {category.description && (
            <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
          )}

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.services.map((service) => (
              <Card key={service.id} className="h-full transition-shadow hover:shadow-md">
                <Link href={`/services/${service.slug}`}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </CardHeader>
                </Link>
                {service.children.length > 0 && (
                  <ul className="flex flex-col gap-1 px-6 pb-4">
                    {service.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/services/${child.slug}`}
                          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
```

Two changes from the original: the `services` include now filters to `parentServiceId: null` (top-level only) and pulls in active `children`; each card now wraps only its header in the `Link` (children need their own separate links, so the whole card can no longer be one big anchor) and renders a child link list beneath the header when present.

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean.

- [ ] **Step 3: Manual check**

With `pnpm dev` running, visit `/services`. Expected: "Marine Survey & Inspection" section shows a "Develop Vessel-Specific Draft Survey Form" card and a "Vessel Condition Inspection" card; the latter has "Third Party Hold Inspection" listed underneath as a sub-link; "Maritime Training" and "Remote Marine Support" sections no longer show Competency Training / Document Review / Expert Advisory.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(marketing)/services/page.tsx"
git commit -m "feat: nest child services under their parent card on the public services page"
```

---

### Task 6: Service detail page — parent breadcrumb and "Includes" section

**Files:**
- Modify: `src/app/(marketing)/services/[slug]/page.tsx`

**Interfaces:**
- Consumes: `Service.parent`/`Service.children` relations (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update `getService` and the page body**

Full updated file:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isFaqArray } from "@/lib/faq";
import { Section } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

async function getService(slug: string) {
  return db.service.findUnique({
    where: { slug, isActive: true },
    include: {
      category: true,
      parent: true,
      children: { where: { isActive: true }, orderBy: { order: "asc" } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return {};

  return {
    title: service.name,
    description: service.overview ?? `${service.name} — ${service.category.name} from DMD Marine.`,
  };
}

export async function generateStaticParams() {
  const services = await db.service.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return services.map((service) => ({ slug: service.slug }));
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();

  const faq = isFaqArray(service.faq) ? service.faq : [];
  const hasContent = service.overview || service.benefits || service.scope || service.process;

  return (
    <>
      <Section containerClassName="max-w-3xl">
        <div className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold tracking-wide text-accent uppercase">
          <Link href={`/services#${service.category.slug}`}>{service.category.name}</Link>
          {service.parent && (
            <>
              <span aria-hidden>/</span>
              <Link href={`/services/${service.parent.slug}`}>{service.parent.name}</Link>
            </>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {service.name}
        </h1>

        {hasContent ? (
          <div className="mt-8 space-y-8">
            {service.overview && (
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Overview</h2>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">
                  {service.overview}
                </p>
              </div>
            )}
            {service.benefits && (
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Benefits</h2>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">
                  {service.benefits}
                </p>
              </div>
            )}
            {service.scope && (
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Scope</h2>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">{service.scope}</p>
              </div>
            )}
            {service.process && (
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Process</h2>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">
                  {service.process}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-8 text-muted-foreground">
            Detailed information for this service is being finalized. Contact us
            for a full overview of scope, process, and pricing.
          </p>
        )}

        {service.children.length > 0 && (
          <div className="mt-10">
            <h2 className="font-heading text-lg font-semibold text-foreground">Includes</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {service.children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/services/${child.slug}`}
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {faq.length > 0 && (
          <div className="mt-10">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Frequently Asked Questions
            </h2>
            <Accordion className="mt-4">
              {faq.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        <div className="mt-10">
          <Button
            size="lg"
            nativeButton={false}
            render={
              <Link href={`/book-consultation?service=${service.slug}`}>
                Request This Service
              </Link>
            }
          />
        </div>
      </Section>
    </>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean.

- [ ] **Step 3: Manual check**

Visit `/services/vessel-condition-inspection`. Expected: breadcrumb reads "Marine Survey & Inspection", an "Includes" section lists "Third Party Hold Inspection" linking to `/services/third-party-hold-inspection`. Visit `/services/third-party-hold-inspection`. Expected: breadcrumb reads "Marine Survey & Inspection / Vessel Condition Inspection". Visit `/services/develop-vessel-specific-draft-survey-form`. Expected: renders correctly, no parent, no children.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(marketing)/services/[slug]/page.tsx"
git commit -m "feat: show parent breadcrumb and child services on service detail page"
```

---

### Task 7: Book Consultation dropdown groups children under their parent

**Files:**
- Modify: `src/app/(marketing)/book-consultation/page.tsx`
- Modify: `src/app/(marketing)/book-consultation/booking-form.tsx`

**Interfaces:**
- Consumes: `Service.parentServiceId` (Task 1).
- Produces: `BookingForm`'s `ServiceOption` type gains `parentServiceId: string | null`.

- [ ] **Step 1: Include and sort by hierarchy in the page**

In `src/app/(marketing)/book-consultation/page.tsx`, order children right after their parent and pass `parentServiceId` through:

```tsx
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage";
import { Section } from "@/components/marketing/section";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: "Book Consultation",
  description: "Request a marine consultation, survey, or inspection from DMD Marine.",
};

export default async function BookConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service: serviceSlug } = await searchParams;

  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    include: { category: true },
  });

  const topLevel = services.filter((service) => !service.parentServiceId);
  const orderedServices = topLevel.flatMap((parent) => [
    parent,
    ...services.filter((service) => service.parentServiceId === parent.id),
  ]);

  const defaultService = serviceSlug
    ? services.find((service) => service.slug === serviceSlug)
    : undefined;

  return (
    <Section containerClassName="max-w-2xl">
      <span className="text-xs font-semibold tracking-wide text-accent uppercase">
        Book Consultation
      </span>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Request a Consultation
      </h1>
      <p className="mt-4 text-muted-foreground">
        Tell us about your vessel and requirements — we&apos;ll follow up to
        confirm scheduling and next steps.
      </p>

      <div className="mt-10">
        <BookingForm
          services={orderedServices.map((service) => ({
            id: service.id,
            name: service.name,
            categoryName: service.category.name,
            parentServiceId: service.parentServiceId,
          }))}
          defaultServiceId={defaultService?.id}
          attachmentsEnabled={isStorageConfigured}
        />
      </div>
    </Section>
  );
}
```

`orderedServices` walks top-level services in their existing category/order sort, splicing each one's children in immediately after it — a service with `parentServiceId: null` that has no `.category.order`-eligible children (already sorted) is unaffected; this only reorders where a child needs to sit right after its parent instead of wherever its own `order`/`category.order` would otherwise place it.

- [ ] **Step 2: Indent children in the dropdown**

In `src/app/(marketing)/book-consultation/booking-form.tsx`, update `ServiceOption` and the `SelectItem` rendering:

```tsx
type ServiceOption = { id: string; name: string; categoryName: string; parentServiceId: string | null };
```

```tsx
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.parentServiceId ? `↳ ${service.name}` : `${service.categoryName} — ${service.name}`}
              </SelectItem>
            ))}
          </SelectContent>
```

Full context for this block (only the `SelectItem` body changes; everything else in the file is unchanged from the current version):

```tsx
      <div className="grid gap-1.5">
        <Label htmlFor="serviceId">Service</Label>
        <Select name="serviceId" defaultValue={defaultServiceId} required>
          <SelectTrigger id="serviceId" className="w-full">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.parentServiceId ? `↳ ${service.name}` : `${service.categoryName} — ${service.name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean.

- [ ] **Step 4: Manual check**

Visit `/book-consultation`, open the Service dropdown. Expected: "Marine Survey & Inspection — Vessel Condition Inspection" is immediately followed by "↳ Third Party Hold Inspection"; no Competency Training / Document Review / Expert Advisory entries appear.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(marketing)/book-consultation/page.tsx" "src/app/(marketing)/book-consultation/booking-form.tsx"
git commit -m "feat: group child services under their parent in the booking form dropdown"
```

---

### Task 8: Update `prisma/seed.ts` so fresh installs match the reorg

**Files:**
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (dev-only, runs against a fresh DB).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Restructure the catalog to support an optional parent, apply the rename/removal**

Replace `SERVICE_CATALOG` and `seedServiceCatalog` in `prisma/seed.ts`:

```ts
const SERVICE_CATALOG: {
  category: string;
  services: (string | { name: string; parent: string })[];
}[] = [
  {
    category: "Marine Consultancy",
    services: ["Vessel Operations Consultation", "Marine Advisory", "Operational Risk Assessment"],
  },
  {
    category: "Marine Survey & Inspection",
    services: [
      "Draft Survey",
      "Bunker Survey",
      "Develop Vessel-Specific Draft Survey Form",
      "Vessel Condition Inspection",
      { name: "Third Party Hold Inspection", parent: "Vessel Condition Inspection" },
      "Pre-Purchase Inspection",
      "On-Hire / Off-Hire Survey",
    ],
  },
  {
    category: "Compliance Consulting",
    services: ["ISM / SMS Consulting", "ISPS Consulting", "Documentation Review"],
  },
  {
    category: "Navigation & Deck Operations",
    services: ["Navigation Audit", "Bridge Team Management", "Deck Operations Consulting"],
  },
  {
    category: "Maritime Training",
    services: ["Deck Officer Mentoring", "Career Development"],
  },
  {
    category: "Remote Marine Support",
    services: ["Online Consultation"],
  },
  {
    category: "Incident Support",
    services: ["Incident Investigation", "Root Cause Analysis", "Corrective Action"],
  },
  {
    category: "Port Support",
    services: ["Cargo Operation Support", "Loading Supervision", "Port Advisory"],
  },
];
```

```ts
async function seedServiceCatalog() {
  let categoryCount = 0;
  let serviceCount = 0;

  for (const [categoryOrder, { category, services }] of SERVICE_CATALOG.entries()) {
    const categoryRecord = await db.serviceCategory.upsert({
      where: { slug: slugify(category) },
      update: { name: category, order: categoryOrder },
      create: { name: category, slug: slugify(category), order: categoryOrder },
    });
    categoryCount++;

    // Two passes: top-level services first (so a child can look up its
    // parent's id), then children.
    const topLevel = services.filter((service): service is string => typeof service === "string");
    const children = services.filter(
      (service): service is { name: string; parent: string } => typeof service !== "string",
    );

    for (const [serviceOrder, name] of topLevel.entries()) {
      await db.service.upsert({
        where: { slug: slugify(name) },
        update: { name, categoryId: categoryRecord.id, order: serviceOrder, parentServiceId: null },
        create: {
          name,
          slug: slugify(name),
          categoryId: categoryRecord.id,
          order: serviceOrder,
        },
      });
      serviceCount++;
    }

    for (const [childOrder, { name, parent }] of children.entries()) {
      const parentRecord = await db.service.findUniqueOrThrow({ where: { slug: slugify(parent) } });
      await db.service.upsert({
        where: { slug: slugify(name) },
        update: {
          name,
          categoryId: categoryRecord.id,
          order: childOrder,
          parentServiceId: parentRecord.id,
        },
        create: {
          name,
          slug: slugify(name),
          categoryId: categoryRecord.id,
          order: childOrder,
          parentServiceId: parentRecord.id,
        },
      });
      serviceCount++;
    }
  }

  console.log(`Seeded ${categoryCount} service categories, ${serviceCount} services`);
}
```

Everything else in `prisma/seed.ts` (`seedAdmin`, `seedExpenseCategories`, `seedSiteSettings`, `main`) is unchanged.

- [ ] **Step 2: Verify against a fresh state**

```bash
tsx --env-file=.env prisma/seed.ts
```
Expected: `Seeded 8 service categories, 20 services` (23 original entries − 3 removed = 20), no errors. (Safe to re-run — every upsert is keyed by slug, matching the existing dev-only convention.)

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: update dev seed catalog for service rename, submodule, and removals"
```

---

### Task 9: Update the living spec doc

**Files:**
- Modify: `docs/specs/05-service-management.txt`

**Interfaces:** None — plain text reference doc, nothing else reads it programmatically.

- [ ] **Step 1: Edit the service list**

In `docs/specs/05-service-management.txt`, under section `2. Marine Survey & Inspection`, change:
```
Third Party Hold Inspection

Vessel Condition Inspection
```
to:
```
Develop Vessel-Specific Draft Survey Form

Vessel Condition Inspection
  - Third Party Hold Inspection (submodule)
```

Under section `5. Maritime Training`, remove the `Competency Training` line (and its surrounding blank line, matching the file's existing one-item-per-blank-line-block style).

Under section `6. Remote Marine Support`, remove the `Document Review` and `Expert Advisory` lines.

- [ ] **Step 2: Commit**

```bash
git add docs/specs/05-service-management.txt
git commit -m "docs: sync service management spec with catalog reorg"
```

---

### Task 10: Full verification pass

**Files:** None modified — this task only runs checks.

**Interfaces:** None.

- [ ] **Step 1: Static checks**

```bash
pnpm typecheck
pnpm lint
pnpm build
```
Expected: all three clean/succeed.

- [ ] **Step 2: Idempotency re-check on the data script**

```bash
tsx --env-file=.env scripts/migrate-service-catalog.ts
```
Expected: `Skip rename...`, `Third Party Hold Inspection submodule ready...`, `Soft-deleted 0 unused service(s).` — confirms it's still a no-op on a second run after all the code changes.

- [ ] **Step 3: Manual browser walkthrough**

With `pnpm dev` running:
- `/services` — "Develop Vessel-Specific Draft Survey Form" card present; "Vessel Condition Inspection" card shows "Third Party Hold Inspection" nested; no Competency Training / Document Review / Expert Advisory anywhere.
- `/services/develop-vessel-specific-draft-survey-form` — loads, no parent breadcrumb, no children section.
- `/services/vessel-condition-inspection` — loads, "Includes" section links to Third Party Hold Inspection.
- `/services/third-party-hold-inspection` — loads, breadcrumb shows "Marine Survey & Inspection / Vessel Condition Inspection".
- `/services/competency-training`, `/services/document-review`, `/services/expert-advisory` — all 404 (`notFound()` fires because `isActive: false`).
- `/book-consultation` — dropdown groups "↳ Third Party Hold Inspection" under "Marine Survey & Inspection — Vessel Condition Inspection"; no removed services listed.
- `/dashboard/services` (signed in as admin) — table shows Third Party Hold Inspection indented under Vessel Condition Inspection; Competency Training/Document Review/Expert Advisory still visible with an "Disabled" badge/toggle (soft-deleted, not gone — admin can re-enable); editing any top-level service shows the new Parent Service field.
- Browser console: no errors on any of the above pages.

- [ ] **Step 4: Final commit (if any cleanup was needed)**

Only if Step 1–3 surfaced fixes:
```bash
git add -A
git commit -m "fix: address issues found in full verification pass"
```
