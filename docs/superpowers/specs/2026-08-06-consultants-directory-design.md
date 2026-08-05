# Consultants Directory Module

Date: 2026-08-06

## Context

This is sub-project 2 of 4 from a larger request (Currency conversion — done,
merged — Consultants directory, Company Documents & Forms, Projects
required-forms). Each gets its own spec/plan/implementation cycle. Build
order: Currency → **Consultants** → Documents & Forms → Projects
required-forms.

No separate Consultant entity exists today. "Consultant" currently just
means a `User` (login account) assigned to bookings/projects/schedules via
`consultantId`. The existing `Settings > Users` screen
(`src/app/dashboard/settings/{page,users-table,create-user-dialog}.tsx`,
ADMIN-only) manages login/role/active-status for every `User`, but has no
name/email editing and no profile fields beyond that.

Confirmed with user:
- Extend the existing `User` model — no new table.
- Every consultant needs real login credentials (name/email/password);
  `User.passwordHash` stays required, no schema change to core auth fields.
- Consultants gets its own new sidebar page/module, separate from
  Settings > Users (which keeps owning role/active-status).
- "Delete" is a soft delete (`isActive: false`) — `User` is referenced by
  required (non-nullable) foreign keys on `Project.consultantId` and
  `Schedule.consultantId`, plus `Booking`/`Message`/`Expense`/`AuditLog`
  relations, so a real hard-delete is unsafe/often impossible. This matches
  the existing Settings > Users screen, which already only ever toggles
  `isActive`, never deletes a `User` row.

## 1. Schema change

Add three nullable columns to `User` in `prisma/schema.prisma`:

```prisma
model User {
  id           String  @id @default(cuid())
  name         String
  email        String  @unique
  passwordHash String
  role         Role    @default(STAFF)
  isActive     Boolean @default(true)
  image        String?
  rank              String?
  vesselExperience  String?
  phone             String?
  ...
}
```

Additive, nullable — safe, zero-downtime migration. No change to
`passwordHash`, `role`, or any existing relation.

`rank` is a plain string, not a Prisma enum — validated in the app layer
against a fixed constant list (below), so adding a new rank later never
needs a migration.

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
```

The array's order IS the seniority order used for "sort by rank" (index 0 =
most senior). `"Other"` sorts last regardless of position by being placed
last in the array.

## 2. Scope split: Consultants vs. Settings > Users

Consultants creation still creates a real `User` row with login
credentials, but **Role stays exclusively managed in Settings > Users** —
the Consultants create/edit form never shows a Role field. New consultants
are created with `role: "STAFF"` (the existing model default). This avoids
duplicating access-control logic across two screens: Settings > Users
answers "who can log in as what," Consultants answers "who is this person,
professionally."

Settings > Users is unchanged by this module — same fields, same table,
same actions. Consultants is a new, separate screen over the same `User`
table with a different field focus (name/email/rank/vessel
experience/phone) and its own create/edit/delete actions.

## 3. RBAC

ADMIN-only, matching Settings > Users exactly (`src/app/dashboard/settings/page.tsx`'s
`if (session?.user.role !== "ADMIN") return <AccessDenied ... />` pattern) —
same underlying table, same sensitivity (creates real login credentials).

## 4. Routes, nav, files

New route `/dashboard/consultants`. New sidebar entry in
`src/components/shared/sidebar.tsx`'s `NAV_ITEMS`, positioned after
"Customers" (both are people-directory screens) — a new icon distinct from
Customers' `Users` icon (e.g. `UserCog` from `lucide-react`, already used
elsewhere in the icon set's style).

Files:
- `src/lib/consultant-ranks.ts` — the rank constant list (above).
- `src/app/dashboard/consultants/page.tsx` — server component, ADMIN gate,
  fetches all `User` rows with the new fields, passes to the table.
- `src/app/dashboard/consultants/consultants-table.tsx` — client component:
  search-by-name (client-side `useMemo` filter, matching
  `customers-table.tsx`'s exact pattern), sort-by-rank/name toggle, `Table`
  render (same component as every other list in the dashboard —
  horizontally scrollable on narrow viewports, no separate mobile
  component needed, matching the existing convention).
- `src/app/dashboard/consultants/consultant-form-dialog.tsx` — create/edit
  dialog. Create mode: Name, Email, Temporary Password, Rank (select),
  Vessel Experience (textarea), Phone. Edit mode: same fields minus
  Password (no password-reset flow in this module — out of scope, matches
  original request's field list, which never mentioned password changes).
- `src/app/dashboard/consultants/actions.ts` — `createConsultant`,
  `updateConsultant`, `deactivateConsultant`, `reactivateConsultant`. All
  `requireRole("ADMIN")`. `createConsultant` hashes the temp password with
  the same `hashPassword` util Settings > Users' `createUser` already uses
  (`src/lib/password.ts`) and creates a `User` with `role: "STAFF"`, `rank`,
  `vesselExperience`, `phone`.

## 5. Delete → soft delete UX

Each active consultant's row has a "Delete" icon button (trash icon,
destructive styling) that opens a confirmation dialog ("Deactivate
<name>?") before calling `deactivateConsultant` (`isActive: false`).
Inactive consultants show an "Inactive" badge and a "Restore" button
(`reactivateConsultant`, `isActive: true`) instead of Delete — recoverable,
never a permanent action, consistent with Settings > Users' existing
`ActiveToggle` behavior but expressed as explicit buttons (matching the
literal "Delete" language from the original request) rather than a Switch.

Deactivated consultants are excluded from any "assign consultant" picker
elsewhere in the app that already filters `where: { isActive: true }`
(e.g. `Service.defaultConsultantId` picker, `Project`/`Booking` consultant
assignment) — no change needed there, those queries already filter on the
same `isActive` flag this module also uses.

## 6. Validation

`src/lib/validations/consultant.ts`, Zod schema: `name` (min 2 chars),
`email` (valid email, uniqueness enforced at the DB level same as today's
`createUser`), `password` (min 8 chars, create-only), `rank` (optional,
must be one of `CONSULTANT_RANKS` if present), `vesselExperience`
(optional, free text), `phone` (optional, free text — no format
enforcement, matches how `Customer.phone`/`Company.phone` are handled
elsewhere in this codebase, both plain optional strings with no validation
regex).

## 7. Out of scope

- No password reset/change flow in this module.
- No Role field in Consultants' create/edit form (Settings > Users only).
- No new relation/table for "vessel experience" — single free-text field,
  not a structured list of vessel types.
- No change to any existing consultant-assignment picker/query — they
  already filter `isActive: true`.
- No hard delete, ever, for `User`.

## Testing

No automated test suite exists in this project (established convention) —
verification is `pnpm typecheck`, `pnpm lint`, `pnpm build`, and manual
browser checks:
- `/dashboard/consultants` loads for ADMIN, shows `<AccessDenied>` for
  every other role.
- Create a consultant with all fields → appears in the list, can log in
  with the temp password (matches existing `createUser` behavior).
- Create with only required fields (name/email/password) → rank/vessel
  experience/phone show as empty/"—" in the list, no validation error.
- Search filters by name substring, case-insensitive.
- Sort by rank groups by seniority (not alphabetical); sort by name is
  alphabetical.
- Delete → confirmation dialog → row shows "Inactive" + Restore button, no
  longer appears in the Service/Project/Booking consultant-assignment
  pickers.
- Restore → consultant active again, reappears in pickers.
- Edit → name/rank/vessel experience/phone update; email editable and
  re-validated for uniqueness/format.
- Non-ADMIN roles (MANAGER/STAFF/FINANCE_OFFICER) see `<AccessDenied>` on
  `/dashboard/consultants` and the nav item still renders (matching
  Settings' current behavior — the page itself gates, not the nav link).
