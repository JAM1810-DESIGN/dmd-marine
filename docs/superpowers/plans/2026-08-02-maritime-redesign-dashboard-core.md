# Maritime Redesign — Plan B: Dashboard Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the shared components built in Plan A (`StatCard`, `EmptyState`, `Alert`) to the dashboard-core pages, and fix the handful of page-specific hardcoded colors the Plan A survey found (one Tailwind color outlier, and hardcoded hex values in recharts chart props that can't take Tailwind classes). This is Plan B of 5 in the maritime redesign; Plan A (foundation, primitives, shared components, nav shell) is already merged to `master`.

**Architecture:** Plan A already restyled every shared UI primitive via the token system — dashboard-core pages already render in the new palette with zero changes needed for color. What's left is presentational-pattern adoption: swapping ad-hoc `<p>No results</p>` empty-state text for the `EmptyState` component (a genuine visual upgrade — dashed-border box with icon, not just a class change), swapping the 12 hand-rolled KPI `Card` blocks in the dashboard overview for `StatCard`, adding one `Alert` for a static status banner, and fixing color values that can't flow through Tailwind (recharts `fill`/`stroke` props need literal CSS color strings, not classes — solved by pointing them at the existing `var(--chart-1)`..`var(--chart-5)` CSS custom properties instead of hardcoded hex).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, `lucide-react`, `recharts`. No new dependencies.

## Global Constraints

- No changes to server actions, Prisma schema, `auth.ts`, `middleware.ts`, or validation schemas — this plan touches only `.tsx` files under `src/app/dashboard/` (excluding `finance/`, which is a separate plan).
- Every empty-state swap must preserve the original message text exactly (these are user-facing copy, not placeholder text to rewrite).
- Only adopt `EmptyState` for list/table/section-level empty states with reasonable room (a table body, a detail-page section, a full list panel). Do NOT adopt it for compact inline states inside small containers (a single calendar day cell) — a dashed-border box with a 48px icon circle will look broken squeezed into a tiny cell. The plan below only includes genuine list/section-level candidates; calendar day-cell empty states (`booking-calendar.tsx`, `schedule-calendar.tsx`) are deliberately left as plain text — do not touch them.
- Verification is `pnpm typecheck` + `pnpm lint` (both zero errors) + a browser check per task, consistent with Plan A. Dashboard pages require an authenticated session (seeded dev admin: `admin@dmdmarine.dev` / `DevAdmin123!`, local Postgres via `dmd-postgres` container) — if login-gated browser verification isn't feasible in your environment, a curl-based non-crash check (200/307, not 500) plus careful self-review against the diff is the fallback, same as Plan A.
- Commit after every task.

---

## File Structure

| File | Change |
|---|---|
| `src/app/dashboard/page.tsx` | Replace 12 hand-rolled KPI `Card` blocks with `StatCard` |
| `src/app/dashboard/bookings/bookings-table.tsx` | `EmptyState` for filtered-empty table |
| `src/app/dashboard/calendar/schedule-calendar.tsx` | Fix `bg-emerald-600` → `bg-success` |
| `src/app/dashboard/customers/companies-table.tsx` | `EmptyState` |
| `src/app/dashboard/customers/customers-table.tsx` | `EmptyState` |
| `src/app/dashboard/customers/[id]/page.tsx` | `EmptyState` for linked-bookings section |
| `src/app/dashboard/customers/[id]/vessels-section.tsx` | `EmptyState` |
| `src/app/dashboard/customers/[id]/contact-history-section.tsx` | `EmptyState` |
| `src/app/dashboard/messages/messages-list.tsx` | `EmptyState` |
| `src/app/dashboard/settings/audit-log/page.tsx` | `EmptyState` |
| `src/app/dashboard/facebook/page.tsx` | `Alert` for "not connected" status |
| `src/app/dashboard/facebook/facebook-inbox.tsx` | `EmptyState` for no-leads state |
| `src/app/dashboard/projects/projects-table.tsx` | `EmptyState` |
| `src/app/dashboard/projects/[id]/schedules-section.tsx` | `EmptyState` |
| `src/app/dashboard/projects/[id]/documents-section.tsx` | `EmptyState` |
| `src/app/dashboard/services/requests-table.tsx` | `EmptyState` |
| `src/app/dashboard/reports/report-charts.tsx` | Hardcoded hex → `var(--chart-N)` / `var(--success)` |
| `src/app/dashboard/reports/page.tsx` | Hardcoded hex color props → CSS var strings |

---

### Task 1: Dashboard overview — StatCard migration

**Files:**
- Modify: `src/app/dashboard/page.tsx` (full file)

**Interfaces:**
- Consumes: `StatCard` from `@/components/shared/stat-card` (Plan A, already merged — `StatCard({icon, label, value, href?, trend?, className?})`).

- [ ] **Step 1: Replace the full contents of `src/app/dashboard/page.tsx`**

```tsx
import Link from "next/link";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import {
  Inbox,
  CalendarClock,
  FolderKanban,
  CheckCircle2,
  Users,
  MessageSquare,
  DollarSign,
  Receipt,
  TrendingUp,
  FileClock,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getRevenueTotal, getExpenseTotal, getCashFlow } from "@/lib/finance-calculations";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";

const LIVE_MODULES = [
  { title: "Bookings", href: "/dashboard/bookings" },
  { title: "Customer CRM", href: "/dashboard/customers" },
  { title: "Service Management", href: "/dashboard/services" },
  { title: "Projects", href: "/dashboard/projects" },
  { title: "Calendar", href: "/dashboard/calendar" },
  { title: "Messages", href: "/dashboard/messages" },
  { title: "Facebook", href: "/dashboard/facebook" },
  { title: "Finance", href: "/dashboard/finance" },
  { title: "Reports & Analytics", href: "/dashboard/reports" },
  { title: "Settings", href: "/dashboard/settings" },
];

const UPCOMING_MODULES: { title: string; phase: string }[] = [];

function currency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function DashboardPage() {
  const session = await auth();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [newInquiries, upcomingBookings, activeProjects, completedProjects, customerCount, unreadMessages] =
    await Promise.all([
      db.booking.count({ where: { status: "NEW" } }),
      db.booking.count({
        where: { preferredDate: { gte: startOfToday }, status: { notIn: ["CANCELLED", "COMPLETED"] } },
      }),
      db.project.count({ where: { status: "ACTIVE" } }),
      db.project.count({ where: { status: "COMPLETED" } }),
      db.customer.count(),
      session?.user
        ? db.message.count({ where: { toUserId: session.user.id, isRead: false } })
        : Promise.resolve(0),
    ]);

  const kpis = [
    { title: "New Inquiries", value: newInquiries, icon: Inbox, href: "/dashboard/bookings" },
    { title: "Upcoming Bookings", value: upcomingBookings, icon: CalendarClock, href: "/dashboard/bookings" },
    { title: "Active Projects", value: activeProjects, icon: FolderKanban, href: "/dashboard/projects" },
    { title: "Completed Projects", value: completedProjects, icon: CheckCircle2, href: "/dashboard/projects" },
    { title: "Customers", value: customerCount, icon: Users, href: "/dashboard/customers" },
    { title: "Unread Messages", value: unreadMessages, icon: MessageSquare, href: "/dashboard/messages" },
  ];

  const canViewFinance =
    session?.user.role === "ADMIN" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "FINANCE_OFFICER";

  const financeWidgets = canViewFinance
    ? await (async () => {
        const today = { start: startOfDay(new Date()), end: endOfDay(new Date()) };
        const month = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
        const [todayRevenue, todayExpenses, monthlyRevenue, monthlyExpenses, cashFlow, pendingInvoices, overdueInvoices] =
          await Promise.all([
            getRevenueTotal(today),
            getExpenseTotal(today),
            getRevenueTotal(month),
            getExpenseTotal(month),
            getCashFlow(month),
            db.invoice.count({ where: { status: { in: ["DRAFT", "SENT", "PARTIAL"] } } }),
            db.invoice.count({ where: { status: "OVERDUE" } }),
          ]);
        return {
          todayRevenue,
          todayExpenses,
          monthlyProfit: monthlyRevenue - monthlyExpenses,
          pendingInvoices,
          overdueInvoices,
          cashFlow: cashFlow.net,
        };
      })()
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back, {session?.user?.name}
        </h1>
        <p className="text-sm text-muted-foreground">Signed in as {session?.user?.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <StatCard key={kpi.title} icon={kpi.icon} label={kpi.title} value={kpi.value} href={kpi.href} />
        ))}
      </div>

      {financeWidgets && (
        <div>
          <h2 className="mb-3 font-heading text-base font-semibold text-foreground">Finance Snapshot</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Today's Revenue", value: currency(financeWidgets.todayRevenue), icon: DollarSign },
              { title: "Today's Expenses", value: currency(financeWidgets.todayExpenses), icon: Receipt },
              { title: "Monthly Profit", value: currency(financeWidgets.monthlyProfit), icon: TrendingUp },
              { title: "Pending Invoices", value: financeWidgets.pendingInvoices, icon: FileClock },
              { title: "Overdue Invoices", value: financeWidgets.overdueInvoices, icon: AlertTriangle },
              { title: "Cash Flow (this month)", value: currency(financeWidgets.cashFlow), icon: Wallet },
            ].map((widget) => (
              <StatCard
                key={widget.title}
                icon={widget.icon}
                label={widget.title}
                value={widget.value}
                href="/dashboard/finance"
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 font-heading text-base font-semibold text-foreground">Modules</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LIVE_MODULES.map((module) => (
            <Link key={module.title} href={module.href}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <CardDescription>Open module</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
          {UPCOMING_MODULES.map((module) => (
            <Card key={module.title} className="opacity-70">
              <CardHeader>
                <CardTitle className="text-base">{module.title}</CardTitle>
                <CardDescription>Not yet available</CardDescription>
                <CardAction>
                  <Badge variant="outline">{module.phase}</Badge>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
```

Note: the `Modules` grid is deliberately left as hand-rolled `Card` — it's a navigation tile grid, not a KPI stat display, so it isn't a `StatCard` candidate (`StatCard` always shows a big numeric `value`; these tiles show a static "Open module" caption).

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Log in as `admin@dmdmarine.dev` (password `DevAdmin123!`) and view `/dashboard`. Expected: the 6 core KPI cards and 6 finance KPI cards render as `StatCard`s (icon top-right of label, large bold number, whole card is a clickable link with hover elevation) — visually equivalent to before but using the shared component. The "Modules" grid below is unchanged. Check both light and dark mode via the topbar toggle.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "Adopt StatCard for dashboard overview KPI grids"
```

---

### Task 2: Bookings table — EmptyState

**Files:**
- Modify: `src/app/dashboard/bookings/bookings-table.tsx`

**Interfaces:**
- Consumes: `EmptyState` from `@/components/shared/empty-state` (Plan A).

- [ ] **Step 1: Add the import**

Add near the top of `src/app/dashboard/bookings/bookings-table.tsx`:

```tsx
import { EmptyState } from "@/components/shared/empty-state";
```

- [ ] **Step 2: Replace the empty-state paragraph**

Change (around line 368):

```tsx
      {filtered.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No bookings match your filters.</p>
      ) : (
```

to:

```tsx
      {filtered.length === 0 ? (
        <EmptyState
          className="border-none"
          title="No bookings match your filters"
          description="Try adjusting your search or status filter."
        />
      ) : (
```

(`border-none` removes `EmptyState`'s own dashed border here since it's already inside the table's card container — avoids a double-border look. Later tasks apply the same `border-none` treatment wherever `EmptyState` sits inside an existing `rounded-xl bg-card ring-1 ring-foreground/10` container; omit it only where `EmptyState` is the sole content of its section.)

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Log in, view `/dashboard/bookings`, filter to a status with no matches (or search for a nonsense string). Expected: a dashed-border-free centered icon + "No bookings match your filters" + description renders in place of the table.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/bookings/bookings-table.tsx
git commit -m "Adopt EmptyState in bookings table"
```

---

### Task 3: Calendar — fix hardcoded schedule-type color

**Files:**
- Modify: `src/app/dashboard/calendar/schedule-calendar.tsx`

- [ ] **Step 1: Fix the one non-token color**

Change (around line 33-39):

```tsx
const TYPE_DOT: Record<string, string> = {
  CONSULTATION: "bg-navy",
  SURVEY: "bg-ocean",
  INSPECTION: "bg-gold",
  TRAINING: "bg-emerald-600",
  OTHER: "bg-muted-foreground",
};
```

to:

```tsx
const TYPE_DOT: Record<string, string> = {
  CONSULTATION: "bg-navy",
  SURVEY: "bg-ocean",
  INSPECTION: "bg-gold",
  TRAINING: "bg-success",
  OTHER: "bg-muted-foreground",
};
```

`bg-emerald-600` is a raw Tailwind palette color with no dark-mode variant and no relationship to the design token system; `bg-success` is the semantic token Plan A added and renders correctly in both themes. (Calendar day-cell empty states in this file are intentionally left untouched per this plan's Global Constraints — too compact for `EmptyState`.)

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Log in, view `/dashboard/calendar`, find or create a TRAINING-type schedule entry, confirm its dot renders in the success-green token color in both light and dark mode (should look nearly identical to the old emerald color — this is a token-correctness fix, not a visual redesign).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/calendar/schedule-calendar.tsx
git commit -m "Replace hardcoded emerald color with success token in calendar"
```

---

### Task 4: Customers route — EmptyState (5 files)

**Files:**
- Modify: `src/app/dashboard/customers/companies-table.tsx`
- Modify: `src/app/dashboard/customers/customers-table.tsx`
- Modify: `src/app/dashboard/customers/[id]/page.tsx`
- Modify: `src/app/dashboard/customers/[id]/vessels-section.tsx`
- Modify: `src/app/dashboard/customers/[id]/contact-history-section.tsx`

**Interfaces:**
- Consumes: `EmptyState` from `@/components/shared/empty-state`.

- [ ] **Step 1: `companies-table.tsx`**

Add the import, then change (around line 56-58):

```tsx
      {companies.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No companies yet.</p>
      ) : (
```

to:

```tsx
      {companies.length === 0 ? (
        <EmptyState className="border-none" title="No companies yet" description="Add your first company to get started." />
      ) : (
```

- [ ] **Step 2: `customers-table.tsx`**

Add the import, then change (around line 81-83):

```tsx
      {filtered.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No customers match your search.</p>
      ) : (
```

to:

```tsx
      {filtered.length === 0 ? (
        <EmptyState className="border-none" title="No customers match your search" description="Try a different name or company." />
      ) : (
```

- [ ] **Step 3: `[id]/page.tsx` (customer detail — linked bookings section)**

Add the import, then change (around line 102-104):

```tsx
        {customer.bookings.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">No linked bookings.</p>
        ) : (
```

to:

```tsx
        {customer.bookings.length === 0 ? (
          <EmptyState className="border-none" title="No linked bookings" />
        ) : (
```

- [ ] **Step 4: `[id]/vessels-section.tsx`**

Add the import, then change (around line 41-43):

```tsx
      {vessels.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No vessels on file.</p>
      ) : (
```

to:

```tsx
      {vessels.length === 0 ? (
        <EmptyState className="border-none" title="No vessels on file" />
      ) : (
```

- [ ] **Step 5: `[id]/contact-history-section.tsx`**

Add the import, then change (around line 40-42):

```tsx
      {entries.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No contact history yet.</p>
      ) : (
```

to:

```tsx
      {entries.length === 0 ? (
        <EmptyState className="border-none" title="No contact history yet" />
      ) : (
```

For all five files, the import line to add is:

```tsx
import { EmptyState } from "@/components/shared/empty-state";
```

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Log in, view `/dashboard/customers` (search for a nonsense string to trigger the customers-table empty state; if no companies exist, that empty state shows naturally). Open a customer detail page (`/dashboard/customers/[id]`) for a customer with no vessels/contact-history/bookings if one exists, or temporarily note which sections show real data vs the new empty state. Confirm all five render the icon+title(+description) pattern correctly in light and dark mode.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/customers/companies-table.tsx src/app/dashboard/customers/customers-table.tsx "src/app/dashboard/customers/[id]/page.tsx" "src/app/dashboard/customers/[id]/vessels-section.tsx" "src/app/dashboard/customers/[id]/contact-history-section.tsx"
git commit -m "Adopt EmptyState across customers route"
```

---

### Task 5: Messages — EmptyState

**Files:**
- Modify: `src/app/dashboard/messages/messages-list.tsx`

**Interfaces:**
- Consumes: `EmptyState` from `@/components/shared/empty-state`, `MessageSquare` icon from `lucide-react`.

- [ ] **Step 1: Add imports**

```tsx
import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
```

(If `lucide-react` is already imported in this file for other icons, add `MessageSquare` to the existing import instead of a new line.)

- [ ] **Step 2: Replace the empty-state paragraph**

Change (around line 89-92):

```tsx
      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          {tab === "inbox" ? "No messages yet." : "You haven't sent any messages yet."}
        </p>
      ) : (
```

to:

```tsx
      {items.length === 0 ? (
        <EmptyState
          className="border-none"
          icon={MessageSquare}
          title={tab === "inbox" ? "No messages yet" : "No sent messages yet"}
          description={
            tab === "inbox"
              ? "New messages will appear here."
              : "Messages you send will appear here."
          }
        />
      ) : (
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Log in, view `/dashboard/messages`. If the inbox/sent tabs have no messages, confirm the `EmptyState` renders with a message-square icon and correct copy per tab; toggle between Inbox/Sent tabs to see both variants.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/messages/messages-list.tsx
git commit -m "Adopt EmptyState in messages list"
```

---

### Task 6: Audit log — EmptyState

**Files:**
- Modify: `src/app/dashboard/settings/audit-log/page.tsx`

**Interfaces:**
- Consumes: `EmptyState` from `@/components/shared/empty-state`, `ShieldCheck` icon from `lucide-react`.

- [ ] **Step 1: Add imports**

```tsx
import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
```

- [ ] **Step 2: Replace the empty-state paragraph**

Change (around line 38-39):

```tsx
        {logs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
```

to:

```tsx
        {logs.length === 0 ? (
          <EmptyState
            className="border-none"
            icon={ShieldCheck}
            title="No activity recorded yet"
            description="Sign-ins, account changes, approvals, and payments will appear here."
          />
        ) : (
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Log in as the admin user, view `/dashboard/settings/audit-log`. Since this environment has real audit log entries (login events, etc. from Plan A/prior work), the table will show real rows, not the empty state — confirm via code review that the JSX is correct and, if you want to see it render, temporarily point the Prisma query's `where` at an impossible filter to force zero rows, view the page, then revert before committing.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/settings/audit-log/page.tsx
git commit -m "Adopt EmptyState in audit log"
```

---

### Task 7: Facebook — Alert for connection status + EmptyState for no-leads

**Files:**
- Modify: `src/app/dashboard/facebook/page.tsx`
- Modify: `src/app/dashboard/facebook/facebook-inbox.tsx`

**Interfaces:**
- Consumes: `Alert`, `AlertDescription` from `@/components/ui/alert` (Plan A); `EmptyState` from `@/components/shared/empty-state`.

- [ ] **Step 1: `facebook/page.tsx` — replace the plain-text connection hint with `Alert`**

Add the import:

```tsx
import { Alert, AlertDescription } from "@/components/ui/alert";
```

Change (around line 28-33):

```tsx
        {!isFacebookConfigured && (
          <p className="mt-2 text-xs text-muted-foreground">
            Not connected yet — set the FACEBOOK_* environment variables to receive live
            messages and leads. See Settings for connection status.
          </p>
        )}
```

to:

```tsx
        {!isFacebookConfigured && (
          <Alert variant="warning" className="mt-3">
            <AlertDescription>
              Not connected yet — set the FACEBOOK_* environment variables to receive live
              messages and leads. See Settings for connection status.
            </AlertDescription>
          </Alert>
        )}
```

- [ ] **Step 2: `facebook-inbox.tsx` — replace the no-leads block with `EmptyState`**

Add the import:

```tsx
import { EmptyState } from "@/components/shared/empty-state";
```

Change (around line 138-146):

```tsx
  if (leads.length === 0) {
    return (
      <div className="rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <p className="text-sm text-muted-foreground">
          No Facebook messages or leads yet. They&apos;ll appear here once the webhook is connected.
        </p>
      </div>
    );
  }
```

to:

```tsx
  if (leads.length === 0) {
    return (
      <EmptyState
        title="No Facebook messages or leads yet"
        description="They'll appear here once the webhook is connected."
      />
    );
  }
```

Leave the inline compact fallbacks (`"No contact details"` at ~line 167, `"No messages yet."` inside a single thread at ~line 225, and the lead-list-specific text at ~line 78 if it's a small sidebar-row fallback) untouched — those are compact inline states inside constrained containers, not full-panel empty states, per this plan's Global Constraints. Read the surrounding context for each before deciding; if a given instance turns out to be a full-width, roomy empty section (not a tight row/thread bubble), it's fine to also convert it to `EmptyState` — use judgment and note your reasoning in the report either way.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Log in, view `/dashboard/facebook`. If `FACEBOOK_*` env vars aren't set (they aren't, per `.env`), confirm a warning-styled `Alert` banner renders under the page description. If there are no Facebook leads seeded, confirm the `EmptyState` renders in the main panel instead of the two-column inbox layout.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/facebook/page.tsx src/app/dashboard/facebook/facebook-inbox.tsx
git commit -m "Add connection-status Alert and EmptyState to Facebook inbox"
```

---

### Task 8: Projects route — EmptyState (3 files)

**Files:**
- Modify: `src/app/dashboard/projects/projects-table.tsx`
- Modify: `src/app/dashboard/projects/[id]/schedules-section.tsx`
- Modify: `src/app/dashboard/projects/[id]/documents-section.tsx`

**Interfaces:**
- Consumes: `EmptyState` from `@/components/shared/empty-state`.

- [ ] **Step 1: `projects-table.tsx`**

Add the import, then change (around line 144-146):

```tsx
      {filtered.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No projects match your filters.</p>
      ) : (
```

to:

```tsx
      {filtered.length === 0 ? (
        <EmptyState className="border-none" title="No projects match your filters" description="Try adjusting your search or status filter." />
      ) : (
```

- [ ] **Step 2: `[id]/schedules-section.tsx`**

Add the import, then change (around line 47-49):

```tsx
      {schedules.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No scheduled events yet.</p>
      ) : (
```

to:

```tsx
      {schedules.length === 0 ? (
        <EmptyState className="border-none" title="No scheduled events yet" />
      ) : (
```

- [ ] **Step 3: `[id]/documents-section.tsx`**

Add the import, then change (around line 70-71):

```tsx
      {documents.length === 0 ? (
        <p className="px-4 text-sm text-muted-foreground">No documents yet.</p>
      ) : (
```

to:

```tsx
      {documents.length === 0 ? (
        <EmptyState className="border-none" title="No documents yet" />
      ) : (
```

Import line for all three files:

```tsx
import { EmptyState } from "@/components/shared/empty-state";
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Log in, view `/dashboard/projects` (search a nonsense string), and a project detail page with no schedules/documents if one exists. Confirm both render the icon+title pattern.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/projects/projects-table.tsx "src/app/dashboard/projects/[id]/schedules-section.tsx" "src/app/dashboard/projects/[id]/documents-section.tsx"
git commit -m "Adopt EmptyState across projects route"
```

---

### Task 9: Services — EmptyState

**Files:**
- Modify: `src/app/dashboard/services/requests-table.tsx`

**Interfaces:**
- Consumes: `EmptyState` from `@/components/shared/empty-state`.

- [ ] **Step 1: Add the import and swap the empty state**

```tsx
import { EmptyState } from "@/components/shared/empty-state";
```

Change (around line 40-43):

```tsx
      {requests.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">
          No service requests yet.
        </p>
      ) : (
```

to:

```tsx
      {requests.length === 0 ? (
        <EmptyState className="border-none" title="No service requests yet" />
      ) : (
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Log in, view `/dashboard/services`. If no booking requests exist, confirm the `EmptyState` renders under the "Recent Requests" heading.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/services/requests-table.tsx
git commit -m "Adopt EmptyState in service requests table"
```

---

### Task 10: Reports — replace hardcoded chart colors with CSS custom properties

**Files:**
- Modify: `src/app/dashboard/reports/report-charts.tsx`
- Modify: `src/app/dashboard/reports/page.tsx`

**Interfaces:**
- No signature changes to any exported chart component — `color` prop stays `string | undefined`, just the values passed change. Recharts accepts any valid CSS color string in `fill`/`stroke`, including `var(--custom-property)`, so no recharts API change is needed.

- [ ] **Step 1: Replace the palette and defaults in `report-charts.tsx`**

Change the `COLORS` array and the three hardcoded-hex usages:

```tsx
const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CountBarChart({ data, color = "var(--chart-1)" }: { data: { name: string; count: number }[]; color?: string }) {
```

(only the `COLORS` array and the `CountBarChart` default parameter change — leave the rest of `CountBarChart`, `CountPieChart` unchanged, they already reference `color` and `COLORS` by variable, not by repeating the hex.)

In `InquiriesSeriesChart`, change:

```tsx
          <Bar dataKey="bookings" name="Bookings" fill="#0a2540" radius={[4, 4, 0, 0]} />
          <Bar dataKey="contactSubmissions" name="Contact Form" fill="#c9a036" radius={[4, 4, 0, 0]} />
```

to:

```tsx
          <Bar dataKey="bookings" name="Bookings" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="contactSubmissions" name="Contact Form" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
```

In `CustomerGrowthChart`, change:

```tsx
          <Bar dataKey="newCustomers" name="New Customers" fill="#1e6091" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="totalCustomers" name="Total Customers" stroke="#c9a036" strokeWidth={2} />
```

to:

```tsx
          <Bar dataKey="newCustomers" name="New Customers" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="totalCustomers" name="Total Customers" stroke="var(--chart-3)" strokeWidth={2} />
```

- [ ] **Step 2: Update the two explicit color overrides in `reports/page.tsx`**

Change (around line 68):

```tsx
      chart = <CountBarChart data={data} color="#2f9e44" />;
```

to:

```tsx
      chart = <CountBarChart data={data} color="var(--success)" />;
```

(this is the "Completed Services" report — green/success is a better semantic fit than a generic chart slot for a "completed" metric.)

Change (around line 92):

```tsx
      chart = <CountBarChart data={data} color="#1e6091" />;
```

to:

```tsx
      chart = <CountBarChart data={data} color="var(--chart-2)" />;
```

(`#1e6091` was already the ocean-blue chart color; `var(--chart-2)` is the same color sourced from the token instead of hardcoded, so this report's bar chart matches the rest of the palette and switches correctly in dark mode.)

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Log in, view `/dashboard/reports`, cycle through each report type in the selector (Monthly Inquiries, Bookings by Status, Completed Services, Lead Sources, Customer Growth, Popular Services). Confirm every chart renders with colors from the new maritime palette (no default black/grey fallback, which would indicate a broken `var()` reference), and that switching to dark mode changes the chart colors along with the rest of the page (this is the actual benefit of `var(--chart-N)` over hardcoded hex — recharts re-reads the CSS custom property's current value, so charts now respect the theme).

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/reports/report-charts.tsx src/app/dashboard/reports/page.tsx
git commit -m "Replace hardcoded chart hex colors with CSS custom properties"
```

---

### Task 11: Plan B final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS with zero errors.

- [ ] **Step 2: Full browser QA — light mode**

Log in as `admin@dmdmarine.dev`. Visit `/dashboard`, `/dashboard/bookings`, `/dashboard/calendar`, `/dashboard/customers` (and a customer detail page), `/dashboard/messages`, `/dashboard/settings/audit-log`, `/dashboard/facebook`, `/dashboard/projects` (and a project detail page), `/dashboard/services`, `/dashboard/reports` (cycle all report types). Confirm every `EmptyState`/`StatCard`/`Alert` adoption from Tasks 1–10 renders correctly with real or empty data as available.

- [ ] **Step 3: Full browser QA — dark mode**

Toggle dark mode via the topbar. Repeat the same page walkthrough. Pay particular attention to the recharts colors (Task 10) actually changing with the theme, and the `bg-success` calendar dot (Task 3) being legible against the dark card background.

- [ ] **Step 4: Confirm no unintended scope**

Run: `git log --stat 39f91de..HEAD` (or the appropriate range covering just this plan's commits) and confirm the changed-file list matches exactly the files in this plan's File Structure table — no `finance/` files, no server actions, no schema/auth/middleware files.

- [ ] **Step 5: Final commit (if any QA fixes were made)**

```bash
git add -A
git commit -m "Fix visual issues found in Plan B cross-browser QA pass"
```

(Skip this step if Steps 2–3 found no issues needing fixes.)
