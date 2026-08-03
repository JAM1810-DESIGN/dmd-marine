# Service Catalog Reorg: Rename, Submodule, Removal

Date: 2026-08-04

## Context

Original request described an enterprise-style "module" system (navigation menus,
dashboard cards, per-module routes, permissions, backend endpoints, a separate
mobile app). None of that exists in this codebase. DMD Marine is a single
responsive Next.js app. The three "modules" named in the request are rows in a
flat `Service` table under `ServiceCategory`, rendered by generic, DB-driven
pages (`/services`, `/services/[slug]`, `/book-consultation`, and the admin
`dashboard/services` CRUD screen). There are no per-service routes, nav items,
dashboard widgets, or permission entries to touch — updating the DB rows
propagates everywhere automatically because nothing hardcodes these names.

Confirmed with user:
- Single web app only, no separate mobile codebase.
- "Submodule" relationship gets a real `parentServiceId` self-relation on
  `Service` (not just same-category grouping).
- Removal of unused services is a soft delete (`isActive = false`), not a hard
  delete, to protect any historic bookings/invoices.
- The rename is in-place on the existing row (same id), not a new row.

Checked local dev DB: none of the 5 services involved (Third Party Hold
Inspection, Vessel Condition Inspection, Competency Training, Document Review,
Expert Advisory) have any bookings, projects, invoices, or invoice items
attached. Safe to migrate without a data-reassignment step.

## 1. Schema change

Add a self-relation to `Service` in `prisma/schema.prisma`:

```prisma
model Service {
  ...
  parentServiceId String?
  parent   Service?  @relation("ServiceHierarchy", fields: [parentServiceId], references: [id], onDelete: SetNull)
  children Service[] @relation("ServiceHierarchy")

  ...
  @@index([parentServiceId])
}
```

Additive, nullable column — safe, zero-downtime migration.

## 2. Data migration (one-off script, not raw SQL)

`id` on `Service` is a Prisma-side `@default(cuid())` — there's no DB-level
default (confirmed: `init` migration has no `DEFAULT` for `id` columns). So
the new row needs an app-generated id, which means this is a Prisma Client
script rather than a raw-SQL migration (raw SQL would need a Postgres
extension for id generation the project doesn't have installed).

Add `scripts/migrate-service-catalog.ts`, run once per environment via
`tsx --env-file=.env scripts/migrate-service-catalog.ts`, mirroring
`prisma/seed.ts`'s style. Idempotent (safe to re-run):

1. Rename in place — find the top-level row (`parentServiceId: null`) by its
   current slug, update name+slug on that same id:
   ```ts
   const oldTopLevel = await db.service.findFirst({
     where: { slug: "third-party-hold-inspection", parentServiceId: null },
   });
   if (oldTopLevel) {
     await db.service.update({
       where: { id: oldTopLevel.id },
       data: { name: "Develop Vessel-Specific Draft Survey Form", slug: "develop-vessel-specific-draft-survey-form" },
     });
   }
   ```
2. Insert the new submodule, reusing the now-freed slug, parented to Vessel
   Condition Inspection, same category — only if it doesn't already exist:
   ```ts
   const vesselCondition = await db.service.findFirst({ where: { slug: "vessel-condition-inspection" } });
   if (vesselCondition) {
     await db.service.upsert({
       where: { slug: "third-party-hold-inspection" },
       update: { parentServiceId: vesselCondition.id },
       create: {
         name: "Third Party Hold Inspection",
         slug: "third-party-hold-inspection",
         categoryId: vesselCondition.categoryId,
         parentServiceId: vesselCondition.id,
       },
     });
   }
   ```
3. Soft-delete the three unused services:
   ```ts
   await db.service.updateMany({
     where: { slug: { in: ["competency-training", "document-review", "expert-advisory"] } },
     data: { isActive: false },
   });
   ```

## 3. Admin dashboard (`src/app/dashboard/services/`)

- `page.tsx`: fetch top-level services (for the parent picker) alongside the
  existing full list.
- `service-form-dialog.tsx`: add an optional "Parent Service" select, listing
  only top-level services (a service can't be its own ancestor — exclude the
  service being edited and its descendants from the option list).
- `src/lib/validations/service.ts`: add `parentServiceId` (optional, nullable)
  to `serviceSchema`.
- `actions.ts` (`createService`/`updateService`): pass `parentServiceId`
  through.
- `services-table.tsx`: group rows by parent — render children directly under
  their parent, visually indented, instead of one flat list.

## 4. Public site

- `src/app/(marketing)/services/page.tsx` and `services-overview.tsx`: no
  structural change to category cards. Within a category's service grid,
  render a top-level service's children as a nested sub-list inside/under its
  card.
- `src/app/(marketing)/services/[slug]/page.tsx`: if `service.parent` exists,
  breadcrumb reflects it (`category > parent > service`) and the "back" link
  points at the parent instead of the category anchor. If `service.children`
  is non-empty, add an "Includes" section linking to each child.
- `book-consultation/page.tsx` + `booking-form.tsx`: query includes
  `parent`/`children`; dropdown lists children immediately after their parent,
  visually indented (e.g. `└ Third Party Hold Inspection`) so the two are
  distinguishable.

## 5. Removal handling

No dedicated routes, nav entries, dashboard widgets, or RBAC/permission
entries exist per-service — the "removal" is entirely: soft-delete the 3 rows.
Every public query already filters `isActive: true` (`/services`,
`/services/[slug]` incl. `generateStaticParams`, `book-consultation`,
`sitemap.ts`), so a soft delete removes them from every user-facing surface
with no additional code changes. The dashboard's existing Active/Disabled
toggle continues to let an admin restore them.

`prisma/seed.ts`: remove `"Competency Training"` and `"Document Review"`,
`"Expert Advisory"` from `SERVICE_CATALOG` (so fresh installs never create
them), and update the `"Third Party Hold Inspection"` entry under
`Marine Survey & Inspection` to `"Develop Vessel-Specific Draft Survey Form"`.
Extend the seed's per-category service list to optionally express a
parent (e.g. `{ name: "Third Party Hold Inspection", parent: "Vessel Condition Inspection" }`
alongside plain string entries) so a from-scratch `db:seed` run reproduces the
same hierarchy the data migration creates for existing databases.

`docs/specs/05-service-management.txt`: update the service list to match
(rename + reflect the Third Party Hold Inspection submodule + drop the three
removed entries), since it's a living reference doc, not a historical record.

## 6. Out of scope / not touched

- No mobile app (none exists).
- No navigation menus, dashboard widgets, routes, or RBAC permission tables —
  none exist per-service.
- No backend API endpoints or "unused services" beyond the Service/Category
  CRUD already covered above.

## Testing

- `pnpm prisma migrate dev` applies the schema migration cleanly against local dev DB.
- `pnpm prisma migrate status` clean after.
- `tsx --env-file=.env scripts/migrate-service-catalog.ts` run once, then
  re-run to confirm it's a no-op the second time (idempotency check).
- Manual: `/services` shows renamed service, no Competency Training/Document
  Review/Expert Advisory cards; Vessel Condition Inspection card shows Third
  Party Hold Inspection nested; `/services/[old-slug-that-moved]` 404s
  correctly (old slug now belongs to the child); `/book-consultation` dropdown
  shows correct grouping; dashboard `services-table.tsx` shows nesting and
  parent picker works; toggling a disabled service back to active restores it
  on the public site.
- `pnpm lint`, `pnpm build` (or `tsc --noEmit`) clean.
