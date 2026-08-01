# Maritime UI/UX Redesign — Design Spec

Date: 2026-08-02
Status: Approved by user, ready for implementation planning

## Goal

Redesign the presentation layer of the DMD Marine Consultation & Services platform (marketing site + business dashboard + auth) into a premium, modern, maritime-inspired interface, without changing any business logic, data flow, or functionality. One continuous implementation pass covering the whole app, executed in a fixed internal order (see "Execution order").

## Non-goals / Guardrails

- No changes to server actions (`actions.ts` files), Prisma schema/migrations, `auth.ts`, `middleware.ts`, validation schemas (`src/lib/validations/*`), or any other server-side/business logic.
- No changes to route structure, data-fetching shape, or component prop contracts consumed by logic — only markup, `className`/styling, and purely presentational new components.
- Do not disturb the currently pending (uncommitted) security-hardening changes already in the working tree (audit log, rate limiting, CSP/middleware, password hashing) beyond their JSX/className layer if a redesigned file happens to overlap with one of them.
- Stack stays as-is: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui on Base UI primitives, `next-themes`, `framer-motion`, `lucide-react`, `recharts`. No new UI framework or component library.

## 1. Design Tokens

### Approach

Extend the existing two-layer token pattern already in `src/app/globals.css`: raw brand colors (`--brand-*`) feed semantic shadcn/Tailwind variables (`--primary`, `--secondary`, `--sidebar`, `--chart-1..5`, etc.) via `@theme inline`. Every component already consumes the semantic layer, so remapping it is a low-risk, high-leverage change — no JSX changes required for color to update everywhere.

### Raw brand tokens (`--brand-*`)

| Token | Hex | Source name |
|---|---|---|
| `--brand-navy` | `#0B2545` | Primary Navy |
| `--brand-deep-sea` | `#003049` | Deep Sea |
| `--brand-ocean` | `#1565C0` | Ocean Blue |
| `--brand-harbor` | `#4A90E2` | Harbor Blue |
| `--brand-seafoam` | `#2EC4B6` | Seafoam |
| `--brand-coral` | `#FF6B6B` | Accent Coral |
| `--brand-mist` | `#EAF4F8` | Mist |
| `--brand-sand` | `#F8F5F0` | Sand |

Coral is a raw token only, not wired into any semantic role — reserved for sparing use in marketing contexts (hero emphasis, promo badges) via direct `bg-brand-coral`/`text-brand-coral` utility, so it stays a deliberate accent rather than bleeding into the functional interface palette.

### Semantic tokens — light mode

| Semantic var | Value | Role |
|---|---|---|
| `--background` | `#F7FAFC` | Page background |
| `--foreground` | `#102A43` | Body text |
| `--card` / `--popover` | `#FFFFFF` | Surfaces |
| `--card-foreground` / `--popover-foreground` | `#102A43` | Text on surfaces |
| `--primary` | `--brand-ocean` `#1565C0` | Primary actions, links |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--secondary` | `--brand-mist` `#EAF4F8` | Secondary buttons, tinted sections |
| `--secondary-foreground` | `--brand-navy` `#0B2545` | Text on secondary |
| `--muted` | `--brand-sand` `#F8F5F0` | Alternating section backgrounds |
| `--muted-foreground` | `#5C677D` | Captions, descriptions |
| `--accent` | `--brand-seafoam` `#2EC4B6` | Highlights, active states, chart series |
| `--accent-foreground` | `--brand-navy` `#0B2545` | Text on accent |
| `--destructive` | `#E63946` | Error state |
| `--success` (new) | `#2ECC71` | Success state |
| `--warning` (new) | `#F4B400` | Warning state |
| `--border` / `--input` | `#DCE6EF` | Borders, input outlines |
| `--ring` | `--brand-harbor` `#4A90E2` | Focus ring |
| `--chart-1..5` | navy, ocean, seafoam, harbor, warning | recharts series |
| `--sidebar` | `--brand-navy` `#0B2545` | Sidebar background (kept dark, as today) |
| `--sidebar-primary` | `--brand-seafoam` `#2EC4B6` | Active sidebar item (replaces today's gold) |
| `--sidebar-accent` | `#123A5E` | Sidebar hover state |

For any color that carries text (badges, alerts, success/warning surfaces), follow the pattern the `Button` `destructive` variant already uses: a tinted background (`color/10`) with the solid color as text/border, rather than solid-fill + white text, to keep contrast safely in AA range without hand-picking a separate `-foreground` token per state.

### Semantic tokens — dark mode

Re-derive each role from the same relationships rather than inverting: `--background` → near-black navy (`#04101A`), `--card`/`--popover` → Deep Sea `#003049`, `--foreground` → Mist `#EAF4F8`, `--primary` → Harbor Blue `#4A90E2` (brighter than Ocean Blue for contrast against dark surfaces), `--secondary` → Navy `#0B2545`, `--accent` → Seafoam (stays vivid), `--sidebar` → near-black (`#020B12`, darkest element, consistent with today's dark theme). Exact hex values here are a starting point; final values get verified for WCAG 2.2 AA contrast during the cross-cutting accessibility QA pass (see §4) and adjusted if needed.

### Typography

Keep Geist (`next/font/google`, already wired in `layout.tsx`). Scale:

| Level | Size | Weight/notes |
|---|---|---|
| Display/H1 | 36–48px (28–32px mobile) | Bold, slightly tight tracking |
| H2 | 28–32px | Semibold |
| H3 | 22–24px | Semibold |
| H4 | 18–20px | Medium |
| Body | 15–16px | Regular, 1.6 line-height |
| Small/label | 13–14px | Regular/medium |

### Spacing, radius, motion

- Radius: keep the existing derived scale (`--radius` base → sm/md/lg/xl/2xl/3xl/4xl) — already matches the "modern SaaS rounded card" look, no new scale needed.
- Spacing: no new token scale; increase default whitespace one notch (card padding, inter-section gaps) using Tailwind's existing scale.
- Motion (via `framer-motion`, already installed): 150–200ms fade/slide-up on content mount, 150ms hover elevation on interactive cards, small scale-down on button press (~100ms), skeleton shimmer for loading states. No heavy page-transition choreography — keep it subtle per the brief ("avoid excessive animation").

## 2. Component System

### Restyled in place (same API/props, visual only)

`Button`, `Card`, `Table`, `Badge`, `Dialog`, `Select`, `Input`, `Textarea`, `Dropdown-menu`, `Popover`, `Sheet`, `Switch`, `Progress`, `Avatar`, `Accordion`, `Calendar`, `Separator`, `Label`, `Skeleton` (`src/components/ui/*`). `Badge` gains `success`/`warning` variants alongside existing ones. `Card` gains a `hover:` elevation transition for interactive/link cards (used in dashboard KPI grids and marketing service grids).

### New shared components

- **`EmptyState`** (`src/components/shared/empty-state.tsx`) — icon + heading + description + optional CTA. Replaces the ad-hoc `<p>No invoices match your filters.</p>`-style text repeated per table component (invoices, customers, etc.).
- **`Alert`** (`src/components/ui/alert.tsx`) — static info/success/warning/error banner, distinct from Sonner toasts, for inline messages (e.g. audit-log notices, form-level summaries).
- **Loading states** — add `loading.tsx` files (none exist today) for the main data-heavy routes (dashboard overview, finance pages, customers, reports) using the currently-unused `Skeleton` primitive.
- **`StatCard`** (`src/components/shared/stat-card.tsx`) — formalizes the KPI-card pattern already hand-rolled in `dashboard/page.tsx` (icon + label + big number, optional trend delta) into one reusable component.

### Icons

Lucide throughout (already installed). Functional/action icons stay standard semantic Lucide icons. Maritime icons (Anchor, Compass, Waves, Ship) reserved for branding moments — logo mark, empty-state illustrations, marketing section dividers — never for generic actions, to avoid a cartoonish feel.

## 3. Navigation Shell & Layout

- **Dashboard sidebar** (`src/components/shared/sidebar.tsx`) — same structure and `NAV_ITEMS` data shape; active/hover state moves to the Seafoam accent, refined icon/label spacing.
- **Dashboard topbar + mobile nav** (`src/components/shared/dashboard-topbar.tsx`) — same `Sheet`-based mobile drawer pattern (already correct, needs restyling only), refined notification bell and user dropdown visuals.
- **Dashboard layout** (`src/components/shared/dashboard-layout.tsx`) — same fixed-sidebar + flex-col composition; refine content padding/max-width for large screens and the tablet breakpoint transition between drawer and full sidebar.
- **Marketing navbar/footer** (`src/components/shared/navbar.tsx`, `footer.tsx`) — restyled to new palette (gold CTA → Ocean Blue primary CTA), same sticky/blurred header and 3-column footer structure.
- **List-page pattern** (header → filter row → table; used across invoices/customers/expenses/etc.) — kept structurally; filter row spacing/alignment refined, table gets row hover/zebra treatment, empty state swaps to `EmptyState`, dashboard KPI grids adopt `StatCard`.

## 4. Page Scope, Execution Order, Verification

### Pages covered (~30 routes)

- **Marketing**: home, about, blog + `blog/[slug]`, services + `services/[slug]`, projects + `projects/[id]`, book-consultation, contact.
- **Auth**: login.
- **Dashboard**: overview, bookings, calendar, customers + `customers/[id]`, messages, settings + settings/audit-log, Facebook/CRM, projects + `projects/[id]`, reports, services.
- **Finance module**: overview, budgets, expenses, invoices + `invoices/[id]`, payments, reports, settings, statements.

### Execution order

1. Foundation — tokens/typography in `globals.css`, `ThemeProvider` + dark-mode toggle wiring (currently absent — `next-themes` is installed but not connected).
2. Shared `ui/` primitives restyle.
3. New shared components — `EmptyState`, `Alert`, `StatCard`, `loading.tsx` skeletons.
4. Navigation shell — sidebar, topbar, mobile drawer, dashboard layout, marketing navbar/footer.
5. Dashboard core pages.
6. Finance module.
7. Facebook/CRM + reports.
8. Marketing site pages.
9. Auth/login polish.
10. Cross-cutting QA — dark mode, accessibility, responsive.

Because most pages already build on the shared primitives and the list-page pattern, steps 5–9 are largely "apply `EmptyState`/`StatCard` where the old ad-hoc pattern exists, verify visuals render correctly with new tokens" rather than full rewrites. Genuinely custom pages (hero, service grids, KPI dashboard, invoice detail) get individual layout attention.

### Accessibility (WCAG 2.2 AA)

Verify contrast for every new token pairing (Seafoam/Coral text-on-color combinations need explicit checking), visible focus-visible rings on all interactive elements, keyboard navigation (largely inherited from the Base UI primitives already in use), preserved semantic HTML, and existing form-error announcement behavior (`FormMessage`) kept intact.

### Verification approach

After each phase: run `tsc --noEmit` and `lint` to catch regressions, then a browser pass against the dev server — click through the affected pages, check console/network errors, resize for mobile/tablet/desktop, toggle dark mode. Functional smoke-check per page group (forms submit, tables filter, auth still works) since business logic must remain byte-for-byte unchanged in behavior.
