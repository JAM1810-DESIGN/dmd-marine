# Database

PostgreSQL via Prisma ORM, connected through the `@prisma/adapter-pg` driver adapter (pure-JS `pg` driver — no native query-engine binary to package or trace in Docker). The schema is the single source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma). This page is a map, not a duplicate of it.

## Domain groups

| Group | Models |
|---|---|
| Users & auth | `User` (role enum: `ADMIN`, `MANAGER`, `STAFF`, `FINANCE_OFFICER`) |
| Customer CRM | `Company`, `Customer`, `Vessel`, `ContactHistory` |
| Services | `ServiceCategory`, `Service` |
| Booking | `Booking`, `Schedule` |
| Projects | `Project`, `Document` (shared by project docs/reports and all four finance receipt types via a `category` enum) |
| Communication | `Message`, `Notification`, `FacebookLead` |
| Marketing site | `BlogPost`, `ContactSubmission`, `Testimonial`, `SiteSettings` |
| Finance | `Branch`, `Vendor`, `ExpenseCategory`, `Expense`, `Invoice`, `InvoiceItem`, `Payment`, `Budget`, `FinancialStatement` |
| Security | `AuditLog` |

## Deliberate deviations from a literal 1:1 spec mapping

Documented in full at the top of `schema.prisma`; summarized here:

- **No separate `Permission` table** — `Role` is a plain enum on `User`. Four fixed roles, no per-user override requirement.
- **No separate `ServiceRequest` model** — the public "Book Consultation" form and every per-service "Request Service" CTA both create a `Booking`.
- **One `Document` model, not four/five** — project documents, project reports, and all four finance receipt types share one model with a `category` enum, giving one upload/preview/download code path.
- **No separate `Income` ledger** — `Invoice` + its `Payment`s already contain every field the spec's "Income" record would have (customer, service, booking, branch, amount, payment status/method/date), so it doubles as the income ledger.

## Migrations

Standard Prisma workflow: `pnpm db:migrate` (wraps `prisma migrate dev`) for schema changes in development, `prisma migrate deploy` in production (see [DEPLOYMENT.md](./DEPLOYMENT.md)). Migrations live in `prisma/migrations/` and are committed — never edit an already-applied migration file; add a new one.

If `prisma migrate dev` refuses because a change needs a destructive-looking confirmation it can't ask for in a non-interactive shell, don't force it — write the migration SQL by hand in a correctly-timestamped folder, apply it directly against the database, then run `prisma migrate resolve --applied <name>` to reconcile Prisma's migration history. Verify the affected table's row count first if there's any doubt about data loss.

## Seeding

`pnpm db:seed` runs `prisma/seed.ts` — **development only**. It seeds the real service catalog (8 categories / 27 services, taken from the spec, not invented copy), 23 real expense categories, and one dev admin user (`admin@dmdmarine.dev` / `DevAdmin123!`). It's idempotent (upserts), so re-running it is safe. Never run it against production — there is no production seed data by design; the first admin account for a real deployment is created via the [Admin Guide](./ADMIN_GUIDE.md).

## Indexes

Every model indexes the columns it's actually filtered or joined on in the app's queries (status enums, date-range fields, and foreign keys used in `where`/`groupBy`) — added incrementally as each module was built, with a pass in Phase 11 specifically to catch foreign keys that queries filter on but that Postgres doesn't index automatically (`Invoice.customerId`, `Invoice.branchId`, `Expense.vendorId`, `Expense.branchId`).

## Backups

See [BACKUP.md](./BACKUP.md).
