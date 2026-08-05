# Consultants Directory Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new ADMIN-only `/dashboard/consultants` module with full CRUD (create/edit/soft-delete/restore) over consultant profiles, extending the existing `User` model with `rank`/`vesselExperience`/`phone`, separate from the existing Settings > Users screen which keeps owning role/access-control.

**Architecture:** Three new nullable columns on `User` (no new table). A new route + sidebar entry, following the exact same server-component-page + client-table + dialog + server-actions structure already used by every other management screen in this dashboard (Customers, Services, Budgets). A new small reusable `ConfirmDialog` component fills a real gap — this codebase has zero existing confirm-before-destructive-action UI anywhere, and this module's "Delete" (soft delete) is the first place that needs one.

**Tech Stack:** Next.js 16 (App Router, Server Components/Actions), Prisma 7, Zod, existing shadcn/Base-UI component set (`Dialog`, `Select`, `Table`, `Badge`, `Switch`).

## Global Constraints

- No new table — `rank`, `vesselExperience`, `phone` are nullable columns added directly to `User`.
- `passwordHash` stays required — every consultant is a real login account, created the same way `Settings > Users`' `createUser` already works.
- Role is never editable from this module — Consultants' create/edit forms never show a Role field; new consultants are always created with `role: "STAFF"`. Role management stays exclusively in `Settings > Users`.
- ADMIN-only for the entire module — same gate as `src/app/dashboard/settings/page.tsx`.
- "Delete" is soft delete (`isActive: false`) only — `User` is never hard-deleted anywhere in this codebase (required FKs on `Project.consultantId`, `Schedule.consultantId`, plus `Booking`/`Message`/`Expense`/`AuditLog` relations make it unsafe). Deactivated consultants get a "Restore" action, never a permanent delete.
- Every consultant-assignment picker elsewhere in the app (`bookings/page.tsx`, `projects/page.tsx`, `projects/[id]/page.tsx`, `messages/page.tsx`, `services/page.tsx`) already filters `where: { isActive: true }` — confirmed by reading all five call sites. No changes needed to any of them; deactivating a consultant here automatically removes them from those pickers.
- This project has no automated test runner (no jest/vitest/playwright in `package.json`) — verification steps use `pnpm typecheck`, `pnpm lint`, `pnpm build`, and manual browser checks instead of a test suite.
- Audit logging: every mutating action (`createConsultant`, `updateConsultant`, `deactivateConsultant`, `reactivateConsultant`) calls `logAudit` from `@/lib/audit`, matching `Settings > Users`' `createUser`/`updateUserRole`/`toggleUserActive` exactly. Action strings: `"CONSULTANT_CREATED"`, `"CONSULTANT_UPDATED"`, `"CONSULTANT_DEACTIVATED"`, `"CONSULTANT_REACTIVATED"` — `AuditLog.action` is a plain `String` column (not a Prisma enum), so no schema change is needed to add these.
- Self-protection: an ADMIN can't deactivate their own consultant account (mirrors `toggleUserActive`'s existing `if (id === session.user.id) throw ...` guard).

---

### Task 1: Schema — `rank`/`vesselExperience`/`phone` on `User`, rank constants

**Files:**
- Modify: `prisma/schema.prisma` (the `User` model)
- Create: `prisma/migrations/<timestamp>_add_consultant_profile_fields/migration.sql` (generated, not hand-written)
- Create: `src/lib/consultant-ranks.ts`

**Interfaces:**
- Produces: `User.rank: string | null`, `User.vesselExperience: string | null`, `User.phone: string | null` on the Prisma Client. `export const CONSULTANT_RANKS: readonly string[]`, `export type ConsultantRank` from `src/lib/consultant-ranks.ts`. Every later task that touches the rank field imports `CONSULTANT_RANKS`/`ConsultantRank` from this exact file.

- [ ] **Step 1: Edit the `User` model**

In `prisma/schema.prisma`, inside `model User { ... }`, add three scalar fields after `image`:

```prisma
model User {
  id           String  @id @default(cuid())
  name         String
  email        String  @unique
  passwordHash String
  role         Role    @default(STAFF)
  isActive     Boolean @default(true)
  image        String?
  rank             String?
  vesselExperience String?
  phone            String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

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

  @@map("users")
}
```

Only additions: `rank String?`, `vesselExperience String?`, `phone String?`. Nothing else in the model changes.

- [ ] **Step 2: Generate and apply the migration**

```bash
pnpm prisma migrate dev --name add_consultant_profile_fields
```
Expected: `Your database is now in sync with your schema` and a new
`prisma/migrations/<timestamp>_add_consultant_profile_fields/migration.sql`
containing three `ALTER TABLE "users" ADD COLUMN` statements. Prisma Client
regenerates automatically.

- [ ] **Step 3: Write the rank constants**

```ts
// src/lib/consultant-ranks.ts
export const CONSULTANT_RANKS = [
  "Master / Captain",
  "Chief Officer",
  "Second Officer",
  "Third Officer",
  "Chief Engineer",
  "Second Engineer",
  "Third Engineer",
  "Deck Cadet",
  "Engine Cadet",
  "Bosun",
  "Other",
] as const;

export type ConsultantRank = (typeof CONSULTANT_RANKS)[number];

/** Index in CONSULTANT_RANKS = seniority order (0 = most senior). Unranked/unrecognized values sort last. */
export function rankSortIndex(rank: string | null): number {
  if (!rank) return CONSULTANT_RANKS.length;
  const index = CONSULTANT_RANKS.indexOf(rank as ConsultantRank);
  return index === -1 ? CONSULTANT_RANKS.length : index;
}
```

`rankSortIndex` is included now (not left for the table task to invent) because it's a pure function of the constant list — keeping it in the same file as the list it indexes into avoids the two ever drifting apart.

- [ ] **Step 4: Verify**

```bash
pnpm prisma migrate status
pnpm typecheck
```
Expected: both clean — `Database schema is up to date!` and no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/consultant-ranks.ts
git commit -m "feat: add rank/vesselExperience/phone fields to User for consultant profiles"
```

---

### Task 2: Validation schema

**Files:**
- Create: `src/lib/validations/consultant.ts`

**Interfaces:**
- Consumes: `CONSULTANT_RANKS` from `src/lib/consultant-ranks.ts` (Task 1).
- Produces: `export const createConsultantSchema`, `export const updateConsultantSchema`, `export type CreateConsultantInput`, `export type UpdateConsultantInput`. Task 4's server actions parse `FormData` against these.

- [ ] **Step 1: Write the schemas**

```ts
// src/lib/validations/consultant.ts
import { z } from "zod";
import { CONSULTANT_RANKS } from "@/lib/consultant-ranks";

const rankField = z
  .string()
  .optional()
  .transform((value) => (value && value !== "none" ? value : null))
  .refine((value) => value === null || (CONSULTANT_RANKS as readonly string[]).includes(value), {
    message: "Please select a valid rank.",
  });

export const createConsultantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rank: rankField,
  vesselExperience: z.string().optional().transform((value) => value || null),
  phone: z.string().optional().transform((value) => value || null),
});

export const updateConsultantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  rank: rankField,
  vesselExperience: z.string().optional().transform((value) => value || null),
  phone: z.string().optional().transform((value) => value || null),
});

export type CreateConsultantInput = z.infer<typeof createConsultantSchema>;
export type UpdateConsultantInput = z.infer<typeof updateConsultantSchema>;
```

`updateConsultantSchema` is `createConsultantSchema` minus `password` — kept
as two separate, fully-written-out objects rather than `.omit()`-deriving
one from the other, matching this codebase's existing style (compare
`serviceSchema` vs. how forms are validated elsewhere — every validation
file in `src/lib/validations/` writes each schema out in full, no
`.omit()`/`.extend()` chains).

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
```
Expected: clean (no UI wired to this yet — Tasks 4/5 do that — but the
module must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations/consultant.ts
git commit -m "feat: add create/update consultant validation schemas"
```

---

### Task 3: `ConfirmDialog` shared component

**Files:**
- Create: `src/components/shared/confirm-dialog.tsx`

**Interfaces:**
- Consumes: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogTrigger`, `DialogClose` from `@/components/ui/dialog` (existing); `Button` from `@/components/ui/button` (existing).
- Produces: `export function ConfirmDialog({ trigger, title, description, confirmLabel, onConfirm, variant }: { trigger: React.ReactElement; title: string; description: string; confirmLabel: string; onConfirm: () => void | Promise<void>; variant?: "default" | "destructive" }): JSX.Element`. Task 6 renders this for the Delete action; this component has no other dependency on this module, so it's reusable by any future "are you sure?" action elsewhere in the app.

- [ ] **Step 1: Write the component**

This codebase has zero existing confirm-before-destructive-action UI
anywhere (every delete action in every other table fires immediately on
click) — this is new, general-purpose infrastructure, not something
specific to consultants.

```tsx
// src/components/shared/confirm-dialog.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  variant = "default",
}: {
  trigger: React.ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant={variant} disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Working..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

`variant` defaults to `"default"` but Task 6 passes `"destructive"` for the
Delete confirmation — confirmed `src/components/ui/button.tsx:18-19` has a
`"destructive"` variant (`bg-destructive/10 text-destructive ...`).

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/confirm-dialog.tsx
git commit -m "feat: add reusable ConfirmDialog component for destructive actions"
```

---

### Task 4: Server actions

**Files:**
- Create: `src/app/dashboard/consultants/actions.ts`

**Interfaces:**
- Consumes: `createConsultantSchema`/`updateConsultantSchema` from `src/lib/validations/consultant.ts` (Task 2); `requireRole` from `@/lib/rbac`; `hashPassword` from `@/lib/password`; `logAudit` from `@/lib/audit`; `db` from `@/lib/db`; `AppError` from `@/lib/errors`.
- Produces: `export type ActionState = { error?: string; success?: boolean }`, `export async function createConsultant(_prevState: ActionState, formData: FormData): Promise<ActionState>`, `export async function updateConsultant(id: string, _prevState: ActionState, formData: FormData): Promise<ActionState>`, `export async function deactivateConsultant(id: string): Promise<void>`, `export async function reactivateConsultant(id: string): Promise<void>`. Tasks 5 and 6 call these exact names/signatures.

- [ ] **Step 1: Write the module**

```ts
// src/app/dashboard/consultants/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { createConsultantSchema, updateConsultantSchema } from "@/lib/validations/consultant";

export type ActionState = { error?: string; success?: boolean };

export async function createConsultant(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("ADMIN");

  const parsed = createConsultantSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    rank: formData.get("rank") || undefined,
    vesselExperience: formData.get("vesselExperience") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "A user with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "STAFF",
      rank: parsed.data.rank,
      vesselExperience: parsed.data.vesselExperience,
      phone: parsed.data.phone,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CONSULTANT_CREATED",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email },
  });

  revalidatePath("/dashboard/consultants");
  return { success: true };
}

export async function updateConsultant(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("ADMIN");

  const parsed = updateConsultantSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    rank: formData.get("rank") || undefined,
    vesselExperience: formData.get("vesselExperience") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing && existing.id !== id) {
    return { error: "A user with this email already exists." };
  }

  await db.user.update({ where: { id }, data: parsed.data });

  await logAudit({
    userId: session.user.id,
    action: "CONSULTANT_UPDATED",
    entityType: "User",
    entityId: id,
  });

  revalidatePath("/dashboard/consultants");
  return { success: true };
}

export async function deactivateConsultant(id: string): Promise<void> {
  const session = await requireRole("ADMIN");
  if (id === session.user.id) {
    throw new AppError("BAD_REQUEST", "You can't deactivate your own account.");
  }

  await db.user.update({ where: { id }, data: { isActive: false } });

  await logAudit({
    userId: session.user.id,
    action: "CONSULTANT_DEACTIVATED",
    entityType: "User",
    entityId: id,
  });

  revalidatePath("/dashboard/consultants");
}

export async function reactivateConsultant(id: string): Promise<void> {
  const session = await requireRole("ADMIN");

  await db.user.update({ where: { id }, data: { isActive: true } });

  await logAudit({
    userId: session.user.id,
    action: "CONSULTANT_REACTIVATED",
    entityType: "User",
    entityId: id,
  });

  revalidatePath("/dashboard/consultants");
}
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean (no UI calls these yet — Tasks 5/6 do — but the module
must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/consultants/actions.ts
git commit -m "feat: add consultant create/update/deactivate/reactivate server actions"
```

---

### Task 5: `ConsultantFormDialog`

**Files:**
- Create: `src/app/dashboard/consultants/consultant-form-dialog.tsx`

**Interfaces:**
- Consumes: `createConsultant`/`updateConsultant` from `./actions` (Task 4); `CONSULTANT_RANKS` from `@/lib/consultant-ranks` (Task 1); `notify` from `@/lib/notify` (existing); `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogTrigger` from `@/components/ui/dialog`; `Label`/`Input`/`Textarea`/`Button` from `@/components/ui/*`; `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` from `@/components/ui/select`.
- Produces: `export function ConsultantFormDialog({ trigger, consultant }: { trigger: React.ReactElement; consultant?: ConsultantRecord }): JSX.Element` where `export type ConsultantRecord = { id: string; name: string; email: string; rank: string | null; vesselExperience: string | null; phone: string | null }`. Task 6 imports `ConsultantRecord` and renders this dialog for both "New Consultant" and "Edit" triggers.

- [ ] **Step 1: Write the component**

Modeled directly on `src/app/dashboard/settings/create-user-dialog.tsx` (create-only precedent) and `src/app/dashboard/services/service-form-dialog.tsx` (create-or-edit-via-optional-prop precedent, including the `key`-prop-driven reset pattern documented in that file's comment).

```tsx
// src/app/dashboard/consultants/consultant-form-dialog.tsx
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
import { CONSULTANT_RANKS } from "@/lib/consultant-ranks";
import { createConsultant, updateConsultant } from "./actions";

export type ConsultantRecord = {
  id: string;
  name: string;
  email: string;
  rank: string | null;
  vesselExperience: string | null;
  phone: string | null;
};

export function ConsultantFormDialog({
  trigger,
  consultant,
}: {
  trigger: React.ReactElement;
  consultant?: ConsultantRecord;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = consultant
        ? await updateConsultant(consultant.id, {}, formData)
        : await createConsultant({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      notify.success(consultant ? "Consultant updated" : "Consultant created");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{consultant ? "Edit Consultant" : "New Consultant"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={consultant?.name} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={consultant?.email} required />
          </div>
          {!consultant && (
            <div className="grid gap-1.5">
              <Label htmlFor="password">Temporary Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="rank">Rank</Label>
            <Select name="rank" defaultValue={consultant?.rank ?? "none"}>
              <SelectTrigger id="rank" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {CONSULTANT_RANKS.map((rank) => (
                  <SelectItem key={rank} value={rank}>
                    {rank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="vesselExperience">Vessel Experience</Label>
            <Textarea
              id="vesselExperience"
              name="vesselExperience"
              defaultValue={consultant?.vesselExperience ?? ""}
              rows={3}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={consultant?.phone ?? ""} />
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

Note the `"none"` sentinel on `Select` — matches the exact pattern already
used for `defaultConsultantId`/`parentServiceId` in
`service-form-dialog.tsx` (nullable-field + `"none"`-means-clear
convention). The `rankField` Zod transform in Task 2 already treats
`"none"` as `null`.

- [ ] **Step 2: Verify**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/consultants/consultant-form-dialog.tsx
git commit -m "feat: add consultant create/edit form dialog"
```

---

### Task 6: `ConsultantsTable`

**Files:**
- Create: `src/app/dashboard/consultants/consultants-table.tsx`

**Interfaces:**
- Consumes: `ConsultantFormDialog`, `type ConsultantRecord` from `./consultant-form-dialog` (Task 5); `deactivateConsultant`/`reactivateConsultant` from `./actions` (Task 4); `ConfirmDialog` from `@/components/shared/confirm-dialog` (Task 3); `rankSortIndex` from `@/lib/consultant-ranks` (Task 1); `EmptyState` from `@/components/shared/empty-state` (existing); `notify` from `@/lib/notify`.
- Produces: `export function ConsultantsTable({ consultants }: { consultants: ConsultantRow[] }): JSX.Element` where `export type ConsultantRow = ConsultantRecord & { isActive: boolean }`. Task 7 imports `ConsultantRow` and passes the fetched list.

- [ ] **Step 1: Write the component**

Search-by-name pattern copied directly from
`src/app/dashboard/customers/customers-table.tsx`. Sort toggle is new
(no existing precedent in this codebase for a sort-by dropdown — kept as a
plain controlled `Select`, same component already used for every other
dropdown in this app).

```tsx
// src/app/dashboard/consultants/consultants-table.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
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
import { rankSortIndex } from "@/lib/consultant-ranks";
import { deactivateConsultant, reactivateConsultant } from "./actions";
import { ConsultantFormDialog, type ConsultantRecord } from "./consultant-form-dialog";

export type ConsultantRow = ConsultantRecord & { isActive: boolean };

type SortBy = "name" | "rank";

export function ConsultantsTable({ consultants }: { consultants: ConsultantRow[] }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = query
      ? consultants.filter((consultant) => consultant.name.toLowerCase().includes(query))
      : consultants;

    return [...rows].sort((a, b) => {
      if (sortBy === "rank") {
        const diff = rankSortIndex(a.rank) - rankSortIndex(b.rank);
        if (diff !== 0) return diff;
      }
      return a.name.localeCompare(b.name);
    });
  }, [consultants, search, sortBy]);

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Consultants</h2>
          <p className="text-sm text-muted-foreground">
            Manage consultant profiles, rank, and vessel experience.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:w-56"
          />
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="rank">Sort: Rank</SelectItem>
            </SelectContent>
          </Select>
          <ConsultantFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                New Consultant
              </Button>
            }
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="border-none"
          title="No consultants match your search"
          description="Try a different name."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Vessel Experience</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((consultant) => (
              <TableRow key={consultant.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{consultant.name}</div>
                  <div className="text-xs text-muted-foreground">{consultant.email}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {consultant.rank ?? "—"}
                </TableCell>
                <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                  {consultant.vesselExperience ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {consultant.phone ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={consultant.isActive ? "default" : "outline"}>
                    {consultant.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <ConsultantFormDialog
                      key={consultant.id}
                      consultant={consultant}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Edit consultant">
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                    {consultant.isActive ? (
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Delete consultant">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        }
                        title={`Deactivate ${consultant.name}?`}
                        description="They'll no longer appear in consultant-assignment pickers. Their history stays intact, and you can restore them anytime."
                        confirmLabel="Deactivate"
                        variant="destructive"
                        onConfirm={async () => {
                          await deactivateConsultant(consultant.id);
                          notify.success("Consultant deactivated");
                        }}
                      />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Restore consultant"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await reactivateConsultant(consultant.id);
                            notify.success("Consultant restored");
                          })
                        }
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
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
git add src/app/dashboard/consultants/consultants-table.tsx
git commit -m "feat: add consultants table with search, sort, delete/restore"
```

---

### Task 7: Page + sidebar nav entry

**Files:**
- Create: `src/app/dashboard/consultants/page.tsx`
- Modify: `src/components/shared/sidebar.tsx`

**Interfaces:**
- Consumes: `ConsultantsTable`, `type ConsultantRow` from `./consultants-table` (Task 6).
- Produces: nothing consumed by later tasks — this is the final wiring point.

- [ ] **Step 1: Write the page**

Modeled on `src/app/dashboard/settings/page.tsx`'s ADMIN gate.

```tsx
// src/app/dashboard/consultants/page.tsx
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { ConsultantsTable } from "./consultants-table";

export const metadata: Metadata = { title: "Consultants" };

export default async function ConsultantsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return <AccessDenied message="Only administrators can manage consultants." />;
  }

  const consultants = await db.user.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Consultants</h1>
        <p className="text-sm text-muted-foreground">
          Maritime consultant directory — rank, vessel experience, and contact details.
        </p>
      </div>

      <ConsultantsTable
        consultants={consultants.map((consultant) => ({
          id: consultant.id,
          name: consultant.name,
          email: consultant.email,
          rank: consultant.rank,
          vesselExperience: consultant.vesselExperience,
          phone: consultant.phone,
          isActive: consultant.isActive,
        }))}
      />
    </div>
  );
}
```

`db.user.findMany` intentionally has no `where: { isActive: true }` — this
screen manages BOTH active and inactive consultants (inactive ones show the
"Restore" action), matching `Settings > Users`' identical
all-rows-unfiltered query.

- [ ] **Step 2: Add the sidebar nav entry**

In `src/components/shared/sidebar.tsx`, add `UserCog` to the `lucide-react`
import list and insert a new `NAV_ITEMS` entry immediately after the
`"/dashboard/customers"` entry:

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
} from "lucide-react";
```

```ts
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarClock, enabled: true },
  { href: "/dashboard/customers", label: "Customers", icon: Users, enabled: true },
  { href: "/dashboard/consultants", label: "Consultants", icon: UserCog, enabled: true },
  { href: "/dashboard/services", label: "Services", icon: Wrench, enabled: true },
  ...
```

(Only the `UserCog` import addition and the one new `NAV_ITEMS` array entry
change — every other line in the file stays exactly as-is.)

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
Sign in as the dev admin (`admin@dmdmarine.dev` / `DevAdmin123!`), click
"Consultants" in the sidebar. Expected: page loads, "New Consultant"
creates a row with all fields; editing updates them; "Delete" opens a
confirmation dialog, confirms, and the row shows "Inactive" + a Restore
button; Restore brings it back to "Active". Sign out and sign in as a
non-ADMIN user (or check `session.user.role` logic) — `/dashboard/consultants`
should show `<AccessDenied>`.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/consultants/page.tsx src/components/shared/sidebar.tsx
git commit -m "feat: add consultants page and sidebar nav entry"
```

---

### Task 8: Full verification pass

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

With `pnpm dev` running, signed in as ADMIN:
- `/dashboard/consultants` — list loads, search filters by name
  (case-insensitive substring), sort toggle switches between alphabetical
  and rank-seniority ordering correctly.
- Create a consultant with all fields filled in → appears in the list;
  sign in as that new consultant (in a different browser/incognito
  session) with the temp password to confirm login actually works.
- Create a consultant with only Name/Email/Password (leave Rank/Vessel
  Experience/Phone empty) → no validation error, those columns show "—".
- Edit a consultant's Rank/Vessel Experience/Phone/Name/Email → list
  updates.
- Attempt to create a second consultant with an email that already exists
  → inline error, no duplicate created.
- Delete (deactivate) a consultant who is NOT the currently signed-in
  admin → confirmation dialog appears, confirming sets them Inactive with
  a Restore button; verify they no longer appear in the consultant
  dropdown on `/dashboard/services` (or any other consultant-assignment
  picker).
- Restore them → Active again, reappears in that same picker.
- Sign in as a non-ADMIN role (MANAGER/STAFF/FINANCE_OFFICER) and visit
  `/dashboard/consultants` directly by URL → `<AccessDenied>`, and the
  sidebar "Consultants" link is still visible/clickable (matching
  Settings' existing behavior — gating happens at the page, not the nav).
- Check `/dashboard/settings` (existing Users screen) still works
  unchanged — no Role field appeared in the Consultants dialogs, and no
  Rank/Vessel Experience/Phone fields leaked into Settings > Users.
- Browser console: no errors on any of the above.

- [ ] **Step 3: Final commit (if any cleanup was needed)**

Only if Step 1–2 surfaced fixes:
```bash
git add -A
git commit -m "fix: address issues found in full verification pass"
```
