# Maritime Redesign — Plan A: Foundation, Primitives, Shared Components, Nav Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-theme the app to the new maritime palette via the existing CSS token architecture, activate dark mode, add the three new shared components the redesign needs (EmptyState, Alert, StatCard), and restyle the navigation shell (sidebar, topbar, dashboard layout, marketing navbar/footer). This is Plan A of 5 in the maritime redesign; later plans (Dashboard core, Finance module, Marketing+Auth, Cross-cutting QA) build on what this plan produces.

**Architecture:** The codebase already has a two-layer CSS variable system in `src/app/globals.css` (raw `--brand-*` colors feeding semantic shadcn/Tailwind variables like `--primary`, `--sidebar`, `--chart-1..5`). Every UI primitive already consumes only the semantic layer — confirmed by reading all 19 files in `src/components/ui/`. That means remapping the token values in one file cascades color to nearly every component with zero further edits. The real remaining work is: add tokens that don't exist yet (`success`, `warning`), add the two genuinely new Badge/Card capabilities the redesign needs, build the 3 new shared components, wire up dark mode (installed but never connected), and fix the handful of files that hardcode `bg-navy`/`text-gold` instead of using tokens (`navbar.tsx`, `footer.tsx`, one line in `dashboard-topbar.tsx`).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui on Base UI primitives, `next-themes`, `class-variance-authority`, `lucide-react`.

## Global Constraints

- No changes to server actions, Prisma schema, `auth.ts`, `middleware.ts`, or validation schemas — this plan touches only `globals.css`, files under `src/components/`, `src/app/layout.tsx`, and new `loading.tsx` files.
- No new dependencies — `next-themes`, `class-variance-authority`, `lucide-react` are already installed.
- This is a presentational-only redesign with no existing automated UI test suite. In place of unit-test-driven steps, every task's "test" step is `pnpm typecheck` + `pnpm lint`, plus a concrete browser verification action (what to click, resize, or toggle, and what you should see). Where a new component has no consumer yet in this plan, verify it with a temporary render that is reverted before committing (never leave debug code in the commit).
- Every color must come from a semantic token class (`bg-primary`, `text-muted-foreground`, etc.) or a `--brand-*` raw token — never a new hardcoded hex value in a `.tsx` file.
- Commit after every task.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/app/globals.css` | All design tokens (raw brand colors, semantic light/dark values) |
| `src/components/shared/theme-provider.tsx` (new) | Wraps `next-themes` provider |
| `src/components/shared/theme-toggle.tsx` (new) | Light/dark toggle button |
| `src/app/layout.tsx` | Wires `ThemeProvider` around the app |
| `src/components/ui/badge.tsx` | Adds `success`/`warning` variants |
| `src/components/ui/card.tsx` | Adds `interactive` prop for hover elevation |
| `src/components/ui/table.tsx` | Adds zebra striping to rows |
| `src/components/shared/empty-state.tsx` (new) | Reusable empty-list UI |
| `src/components/ui/alert.tsx` (new) | Static inline banner (info/success/warning/error) |
| `src/components/shared/stat-card.tsx` (new) | Reusable KPI card |
| `src/components/shared/route-loading-skeleton.tsx` (new) | Shared skeleton shape for route `loading.tsx` files |
| `src/app/dashboard/loading.tsx`, `src/app/dashboard/finance/loading.tsx`, `src/app/dashboard/customers/loading.tsx`, `src/app/dashboard/reports/loading.tsx` (new) | Route-level loading skeletons (render `RouteLoadingSkeleton`) |
| `src/components/shared/sidebar.tsx` | Nav item spacing/radius polish |
| `src/components/shared/dashboard-layout.tsx` | Content max-width/padding polish |
| `src/components/shared/dashboard-topbar.tsx` | Fix hardcoded avatar color, add `ThemeToggle` |
| `src/components/shared/navbar.tsx` | Remove hardcoded navy/gold classes, add `ThemeToggle` |
| `src/components/shared/footer.tsx` | Remove hardcoded navy/gold classes |

---

### Task 1: Design tokens (colors, success/warning, dark mode values)

**Files:**
- Modify: `src/app/globals.css` (full file)

**Interfaces:**
- Produces: Tailwind utility classes `bg-success`/`text-success`/`border-success` and `bg-warning`/`text-warning`/`border-warning` (new), plus every existing semantic utility (`bg-primary`, `bg-sidebar`, `bg-chart-1`, etc.) now resolving to the new maritime palette. Consumed by every later task in this plan and all later plans.
- Note: `--brand-gold` / `--brand-gold-light` / `--color-gold` / `--color-gold-light` are kept at their **old** values (unchanged) in this task, because `hero.tsx` and `login-form.tsx` (out of this plan's scope — they belong to the Marketing+Auth plan) still reference `bg-gold`/`text-gold`. The Marketing+Auth plan removes these legacy tokens once those two files are migrated. Do not remove them here.

- [ ] **Step 1: Replace the full contents of `src/app/globals.css`**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

/* Maritime brand palette — raw values. Components should reference the semantic
   tokens below (bg-primary, text-accent, etc.), not these --brand-* variables
   directly, except for deliberate one-off brand moments (e.g. text-brand-coral
   on a marketing page). */
:root {
  --brand-navy: #0b2545;
  --brand-deep-sea: #003049;
  --brand-ocean: #1565c0;
  --brand-harbor: #4a90e2;
  --brand-seafoam: #2ec4b6;
  --brand-coral: #ff6b6b;
  --brand-mist: #eaf4f8;
  --brand-sand: #f8f5f0;

  /* Legacy tokens — still referenced by hero.tsx and login-form.tsx until the
     Marketing+Auth plan migrates them. Remove then, not before. */
  --brand-gold: #c9a036;
  --brand-gold-light: #e4c878;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-navy: var(--brand-navy);
  --color-deep-sea: var(--brand-deep-sea);
  --color-ocean: var(--brand-ocean);
  --color-harbor: var(--brand-harbor);
  --color-seafoam: var(--brand-seafoam);
  --color-coral: var(--brand-coral);
  --color-mist: var(--brand-mist);
  --color-sand: var(--brand-sand);
  --color-gold: var(--brand-gold);
  --color-gold-light: var(--brand-gold-light);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: #f7fafc;
  --foreground: #102a43;
  --card: #ffffff;
  --card-foreground: #102a43;
  --popover: #ffffff;
  --popover-foreground: #102a43;
  --primary: #1565c0;
  --primary-foreground: #ffffff;
  --secondary: #eaf4f8;
  --secondary-foreground: #0b2545;
  --muted: #f8f5f0;
  --muted-foreground: #5c677d;
  --accent: #2ec4b6;
  --accent-foreground: #0b2545;
  --destructive: #e63946;
  --success: #2ecc71;
  --warning: #f4b400;
  --border: #dce6ef;
  --input: #dce6ef;
  --ring: #4a90e2;
  --chart-1: #0b2545;
  --chart-2: #1565c0;
  --chart-3: #2ec4b6;
  --chart-4: #4a90e2;
  --chart-5: #f4b400;
  --radius: 0.625rem;
  --sidebar: #0b2545;
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #2ec4b6;
  --sidebar-primary-foreground: #0b2545;
  --sidebar-accent: #123a5e;
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: #123a5e;
  --sidebar-ring: #2ec4b6;
}

.dark {
  --background: #04101a;
  --foreground: #eaf4f8;
  --card: #003049;
  --card-foreground: #eaf4f8;
  --popover: #003049;
  --popover-foreground: #eaf4f8;
  --primary: #4a90e2;
  --primary-foreground: #04101a;
  --secondary: #0b2545;
  --secondary-foreground: #eaf4f8;
  --muted: #0a2a40;
  --muted-foreground: #9fb7c7;
  --accent: #2ec4b6;
  --accent-foreground: #04101a;
  --destructive: #e63946;
  --success: #2ecc71;
  --warning: #f4b400;
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: #2ec4b6;
  --chart-1: #4a90e2;
  --chart-2: #2ec4b6;
  --chart-3: #f4b400;
  --chart-4: #ff6b6b;
  --chart-5: #eaf4f8;
  --sidebar: #020b12;
  --sidebar-foreground: #eaf4f8;
  --sidebar-primary: #2ec4b6;
  --sidebar-primary-foreground: #04101a;
  --sidebar-accent: #0d2136;
  --sidebar-accent-foreground: #eaf4f8;
  --sidebar-border: oklch(1 0 0 / 8%);
  --sidebar-ring: #2ec4b6;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

- [ ] **Step 2: Verify the app still builds**

Run: `pnpm typecheck`
Expected: PASS, no errors.

- [ ] **Step 3: Visual check**

Run `pnpm dev`, open `http://localhost:3000`. Expected: page loads with no crash, background is off-white (`#F7FAFC`), and any element using `bg-navy`/`text-gold` (currently `navbar.tsx`, `footer.tsx`, `hero.tsx`) still renders in the old navy/gold since those files aren't touched yet — this is expected and gets fixed in Tasks 11–12 (navbar/footer) and later plans (hero). Open browser devtools, select the `<html>` element, manually add class `dark`, confirm background switches to the dark near-black navy and text becomes light — then remove the class again.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "Remap design tokens to the maritime navy/ocean/seafoam palette"
```

---

### Task 2: Wire up dark mode (ThemeProvider + ThemeToggle)

**Files:**
- Create: `src/components/shared/theme-provider.tsx`
- Create: `src/components/shared/theme-toggle.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ThemeProvider` (wraps `children`, forwards all `next-themes` props) and `ThemeToggle` (self-contained button, no required props) — consumed by Task 10 (topbar) and Task 11 (navbar).

- [ ] **Step 1: Create the ThemeProvider wrapper**

```tsx
// src/components/shared/theme-provider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 2: Create the ThemeToggle button**

```tsx
// src/components/shared/theme-toggle.tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-hidden className="opacity-0" disabled>
        <Sun className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
```

- [ ] **Step 3: Wire the provider into the root layout**

In `src/app/layout.tsx`, add the import and wrap `{children}`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { env } from "@/lib/env";
import "./globals.css";
```

(add the `ThemeProvider` import on the line after `Toaster`'s import), then change the `<html>` tag and body to:

```tsx
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
```

`suppressHydrationWarning` on `<html>` is required by `next-themes` because it sets the `class` attribute before React hydrates — without it, React logs a spurious hydration-mismatch warning every page load.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: PASS.

Run `pnpm dev`, open `http://localhost:3000`, open the browser console. Expected: no hydration-warning errors logged. (The toggle button itself isn't visible anywhere yet — that's wired in Task 10/11 — so full light/dark switching is verified there.)

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/theme-provider.tsx src/components/shared/theme-toggle.tsx src/app/layout.tsx
git commit -m "Wire up dark mode via next-themes"
```

---

### Task 3: Badge success/warning variants + Button sizing polish

**Files:**
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/button.tsx`

**Interfaces:**
- Consumes: `--color-success`/`--color-warning` from Task 1.
- Produces: `<Badge variant="success">` / `<Badge variant="warning">` — consumed by later plans (finance status badges, audit-log entries). `Button` sizes are visually taller; no signature change.

- [ ] **Step 1: Add success/warning to `badgeVariants` in `src/components/ui/badge.tsx`**

Change the `variants.variant` object (currently `default`/`secondary`/`destructive`/`outline`/`ghost`/`link`) to add two entries right after `destructive`:

```ts
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        success:
          "bg-success/10 text-success focus-visible:ring-success/20 dark:bg-success/20 dark:focus-visible:ring-success/40 [a]:hover:bg-success/20",
        warning:
          "bg-warning/10 text-warning focus-visible:ring-warning/20 dark:bg-warning/20 dark:focus-visible:ring-warning/40 [a]:hover:bg-warning/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
```

- [ ] **Step 2: Bump Button height/padding for a more premium scale**

In `src/components/ui/button.tsx`, change the `size` variants:

```ts
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-10",
      },
```

And add a subtle shadow to the `default` variant (find the `variant.default` line):

```ts
        default: "bg-primary text-primary-foreground shadow-xs transition-shadow hover:bg-primary/80 hover:shadow-sm",
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Run `pnpm dev`, open `http://localhost:3000/login`. Expected: the "Sign in" button is visibly taller (36px vs 32px) with a soft shadow. Open React DevTools or temporarily add `<Badge variant="success">Paid</Badge>` and `<Badge variant="warning">Pending</Badge>` next to the login form, confirm green-tinted and amber-tinted pill badges render, then remove the temporary badges before committing.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/badge.tsx src/components/ui/button.tsx
git commit -m "Add success/warning badge variants and refine button sizing"
```

---

### Task 4: Card interactive elevation + Table zebra striping

**Files:**
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/table.tsx`

**Interfaces:**
- Produces: `<Card interactive>` (new optional boolean prop, default `false`, fully backward compatible) — consumed by Task 7 (`StatCard`) and later dashboard/marketing plans for link-cards. `TableRow` gains automatic zebra striping — no API change.

- [ ] **Step 1: Add the `interactive` prop to `Card`**

In `src/components/ui/card.tsx`, change the `Card` function:

```tsx
function Card({
  className,
  size = "default",
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm"; interactive?: boolean }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        interactive &&
          "transition-shadow hover:shadow-md hover:ring-foreground/15",
        className
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 2: Add zebra striping to `TableRow`**

In `src/components/ui/table.tsx`, change `TableRow`:

```tsx
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors even:bg-muted/30 hover:bg-muted/60 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Run `pnpm dev`. `Card` has no consumers passing `interactive` yet in this plan — temporarily add `interactive` to one `<Card>` in `src/app/dashboard/page.tsx`, view `/dashboard` in the browser, hover the card, confirm a soft shadow appears on hover, then revert the temporary edit. For the table, log into the dashboard and open `/dashboard/customers` (an existing table page) — confirm alternating rows have a faint background tint and the hover state still works, in both light and dark mode.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/card.tsx src/components/ui/table.tsx
git commit -m "Add Card interactive elevation and Table zebra striping"
```

---

### Task 5: EmptyState component

**Files:**
- Create: `src/components/shared/empty-state.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`.
- Produces: `EmptyState({ icon?: ComponentType<{className?: string}>, title: string, description?: string, action?: ReactNode, className?: string })` — a default export is NOT used, this is a named export. Consumed by the Dashboard-core and Finance-module plans (replacing ad hoc "No results" text in `invoices-table.tsx`, `customers-table.tsx`, etc.).

- [ ] **Step 1: Create the component**

```tsx
// src/components/shared/empty-state.tsx
import type { ComponentType, ReactNode } from "react";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Compass,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Temporarily render it to confirm the visuals: in `src/app/dashboard/page.tsx`, add `import { EmptyState } from "@/components/shared/empty-state";` and temporarily render `<EmptyState title="No results" description="Try adjusting your filters." />` near the top of the page. View `/dashboard` in the browser in both light and dark mode — confirm a dashed-border box with a centered icon, bold title, and muted description renders cleanly. Revert the temporary import/render before committing.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/empty-state.tsx
git commit -m "Add reusable EmptyState component"
```

---

### Task 6: Alert component

**Files:**
- Create: `src/components/ui/alert.tsx`

**Interfaces:**
- Consumes: `--color-success`/`--color-warning`/`--color-destructive` from Task 1.
- Produces: `Alert` (prop `variant: "info" | "success" | "warning" | "error"`, default `"info"`), `AlertTitle`, `AlertDescription` — consumed by later plans for static inline banners (distinct from the existing Sonner toast system).

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/alert.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex w-full gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        info: "border-border bg-secondary text-secondary-foreground [&>svg]:text-primary",
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warning/20 bg-warning/10 text-warning",
        error: "border-destructive/20 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium leading-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Temporarily render all four variants in `src/app/dashboard/page.tsx`:

```tsx
<Alert variant="info"><AlertTitle>Info</AlertTitle><AlertDescription>Test</AlertDescription></Alert>
<Alert variant="success"><AlertTitle>Success</AlertTitle><AlertDescription>Test</AlertDescription></Alert>
<Alert variant="warning"><AlertTitle>Warning</AlertTitle><AlertDescription>Test</AlertDescription></Alert>
<Alert variant="error"><AlertTitle>Error</AlertTitle><AlertDescription>Test</AlertDescription></Alert>
```

View `/dashboard` in the browser in both light and dark mode — confirm each variant has a distinct, legible color treatment (readable text-on-background contrast). Revert the temporary render before committing.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/alert.tsx
git commit -m "Add Alert component for static inline banners"
```

---

### Task 7: StatCard component

**Files:**
- Create: `src/components/shared/stat-card.tsx`

**Interfaces:**
- Consumes: `Card`, `CardHeader`, `CardDescription`, `CardTitle` from `@/components/ui/card` (Task 4's `interactive` prop), `cn` from `@/lib/utils`.
- Produces: `StatCard({ icon: ComponentType<{className?: string}>, label: string, value: string | number, href?: string, trend?: { direction: "up" | "down", label: string }, className?: string })` — consumed by the Dashboard-core and Finance-module plans to replace the hand-rolled KPI `Card`s in `src/app/dashboard/page.tsx`.

- [ ] **Step 1: Create the component**

```tsx
// src/components/shared/stat-card.tsx
import type { ComponentType } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  href,
  trend,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  href?: string;
  trend?: { direction: "up" | "down"; label: string };
  className?: string;
}) {
  const content = (
    <Card interactive={!!href} className={cn("gap-2", className)}>
      <CardHeader className="flex-row items-center justify-between">
        <CardDescription>{label}</CardDescription>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <div className="px-(--card-spacing)">
        <CardTitle className="text-2xl">{value}</CardTitle>
        {trend && (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              trend.direction === "up" ? "text-success" : "text-destructive"
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.label}
          </p>
        )}
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Temporarily replace one of the hand-rolled KPI cards in `src/app/dashboard/page.tsx` with `<StatCard icon={Users} label="Test" value={42} trend={{ direction: "up", label: "12% this month" }} />` (reusing an already-imported icon), view `/dashboard`, confirm the number is large/bold, the label is muted above it, and the trend line renders in green with an up-arrow. Revert the temporary replacement before committing (this component gets adopted for real in the Dashboard-core plan).

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/stat-card.tsx
git commit -m "Add reusable StatCard component"
```

---

### Task 8: Route-level loading skeletons

**Files:**
- Create: `src/components/shared/route-loading-skeleton.tsx`
- Create: `src/app/dashboard/loading.tsx`
- Create: `src/app/dashboard/finance/loading.tsx`
- Create: `src/app/dashboard/customers/loading.tsx`
- Create: `src/app/dashboard/reports/loading.tsx`

**Interfaces:**
- Consumes: `Skeleton` from `@/components/ui/skeleton` (already exists, unchanged).
- Produces: `RouteLoadingSkeleton({ cardCount?: number, showTable?: boolean })` — a regular shared component (Next.js `loading.tsx` convention files can import any component, there's no route-boundary restriction), consumed by the four `loading.tsx` files below. Nothing here is consumed by later tasks in this plan.

- [ ] **Step 1: Create the shared skeleton component**

```tsx
// src/components/shared/route-loading-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function RouteLoadingSkeleton({
  cardCount = 6,
  showTable = false,
}: {
  cardCount?: number;
  showTable?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cardCount }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {showTable && <Skeleton className="h-96 rounded-xl" />}
    </div>
  );
}
```

- [ ] **Step 2: Create the four route `loading.tsx` files**

```tsx
// src/app/dashboard/loading.tsx
import { RouteLoadingSkeleton } from "@/components/shared/route-loading-skeleton";

export default function Loading() {
  return <RouteLoadingSkeleton cardCount={6} />;
}
```

Create `src/app/dashboard/finance/loading.tsx`, `src/app/dashboard/customers/loading.tsx`, and `src/app/dashboard/reports/loading.tsx` with the same content, but `cardCount={3}` and `showTable`:

```tsx
import { RouteLoadingSkeleton } from "@/components/shared/route-loading-skeleton";

export default function Loading() {
  return <RouteLoadingSkeleton cardCount={3} showTable />;
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Run `pnpm dev`. Open browser devtools → Network tab → set throttling to "Slow 3G". Log in and navigate to `/dashboard`, then `/dashboard/finance`, then `/dashboard/customers`, then `/dashboard/reports`. Expected: each navigation briefly shows the pulsing skeleton grid before real content replaces it. Turn network throttling back to "No throttling" afterward.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/route-loading-skeleton.tsx src/app/dashboard/loading.tsx src/app/dashboard/finance/loading.tsx src/app/dashboard/customers/loading.tsx src/app/dashboard/reports/loading.tsx
git commit -m "Add loading skeletons for dashboard, finance, customers, and reports routes"
```

---

### Task 9: Sidebar and dashboard layout polish

**Files:**
- Modify: `src/components/shared/sidebar.tsx`
- Modify: `src/components/shared/dashboard-layout.tsx`

**Interfaces:**
- No signature changes to `SidebarNav` or `DashboardLayout` — visual polish only.

- [ ] **Step 1: Increase sidebar nav item padding and radius**

In `src/components/shared/sidebar.tsx`, there are three `className` strings using `"...rounded-md px-3 py-2..."` (the disabled item, the parent-with-children link, and the plain link) — change `rounded-md px-3 py-2` to `rounded-lg px-3 py-2.5` in all three (leave the nested child-link classes, which use `rounded-md px-2 py-1.5`, unchanged — they're intentionally tighter).

- [ ] **Step 2: Cap and pad the main content column**

In `src/components/shared/dashboard-layout.tsx`, change the `<main>` line:

```tsx
        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Run `pnpm dev`, log in, view `/dashboard` at a desktop width (1280px+) and confirm content no longer stretches edge-to-edge on very wide viewports, and nav items in the sidebar have visibly more vertical breathing room. Resize to mobile width and confirm the sidebar is still hidden (mobile drawer is a separate component, unaffected).

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/sidebar.tsx src/components/shared/dashboard-layout.tsx
git commit -m "Polish sidebar spacing and cap dashboard content width"
```

---

### Task 10: Dashboard topbar — fix hardcoded color, add theme toggle

**Files:**
- Modify: `src/components/shared/dashboard-topbar.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` from Task 2.

- [ ] **Step 1: Add the import**

Add near the top of `src/components/shared/dashboard-topbar.tsx`, after the `NotificationBell` import:

```tsx
import { ThemeToggle } from "@/components/shared/theme-toggle";
```

- [ ] **Step 2: Fix the hardcoded avatar color**

Change:

```tsx
                <AvatarFallback className="bg-navy text-xs text-white">
```

to:

```tsx
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
```

- [ ] **Step 3: Add the toggle next to the notification bell**

Change:

```tsx
      <NotificationBell notifications={notifications} unreadCount={unreadCount} />
```

to:

```tsx
      <ThemeToggle />
      <NotificationBell notifications={notifications} unreadCount={unreadCount} />
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Run `pnpm dev`, log in, view any dashboard page. Expected: a sun/moon icon button sits left of the notification bell; clicking it switches the whole app between light and dark instantly (sidebar, topbar, cards, tables all re-theme); the user-menu avatar circle is Ocean Blue with white initials in light mode.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/dashboard-topbar.tsx
git commit -m "Add dark mode toggle to dashboard topbar, fix hardcoded avatar color"
```

---

### Task 11: Marketing navbar — remove hardcoded navy/gold, add theme toggle

**Files:**
- Modify: `src/components/shared/navbar.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` from Task 2.

- [ ] **Step 1: Replace the full contents of `src/components/shared/navbar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { Anchor, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <Anchor className="size-6 text-primary" aria-hidden />
          <span className="font-heading text-base font-semibold tracking-tight">
            DMD Marine
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/contact">Request Quote</Link>}
          />
          <Button
            nativeButton={false}
            render={<Link href="/book-consultation">Book Consultation</Link>}
          />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>DMD Marine</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
                <Button
                  nativeButton={false}
                  className="mt-2"
                  render={
                    <Link href="/book-consultation" onClick={() => setOpen(false)}>
                      Book Consultation
                    </Link>
                  }
                />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
```

Note: the mobile hamburger trigger moved out of the desktop `<div className="hidden ... md:flex">` block into its own `md:hidden` wrapper alongside the mobile `ThemeToggle` — previously the trigger button carried `md:hidden` itself with no sibling, so this is a structural adjustment, not just a class swap. Read the resulting file back after this edit and confirm there's exactly one `<ThemeToggle />` in the desktop block and one in the mobile block, and exactly one `<Sheet>`.

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Run `pnpm dev`, open `http://localhost:3000`. Expected: navbar background is white with a light border, "DMD Marine" logo text is dark, Anchor icon is Ocean Blue, nav links are muted gray with dark-on-hover, "Request Quote" is an outline button, "Book Consultation" is a solid Ocean Blue button. Click the theme toggle — navbar background goes dark, text goes light, border becomes subtle. Resize to mobile width — confirm hamburger menu still opens the same right-side sheet with all links plus the toggle now sitting next to the hamburger icon.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/navbar.tsx
git commit -m "Migrate navbar off hardcoded navy/gold classes, add dark mode toggle"
```

---

### Task 12: Marketing footer — remove hardcoded navy/gold

**Files:**
- Modify: `src/components/shared/footer.tsx`

**Interfaces:**
- No signature change — `Footer` stays a parameterless async server component.

- [ ] **Step 1: Replace the full contents of `src/components/shared/footer.tsx`**

```tsx
import Link from "next/link";
import { Anchor, Mail, Phone, MapPin } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export async function Footer() {
  const settings = await getSiteSettings();
  const hasContactDetails = settings.email || settings.phone || settings.address;
  const hasSocial = settings.facebookUrl || settings.linkedinUrl || settings.instagramUrl;

  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-foreground">
            <Anchor className="size-6 text-primary" aria-hidden />
            <span className="font-heading text-base font-semibold tracking-tight">
              {settings.companyName}
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Independent Marine Expertise for Vessel Operations, Cargo Assurance,
            Compliance, and Maritime Professional Development.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Navigate</h3>
          <ul className="mt-3 space-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Contact</h3>
          {hasContactDetails ? (
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {settings.email && (
                <li className="flex items-center gap-2">
                  <Mail className="size-4 shrink-0" />
                  <a href={`mailto:${settings.email}`} className="hover:text-foreground">
                    {settings.email}
                  </a>
                </li>
              )}
              {settings.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0" />
                  <a href={`tel:${settings.phone}`} className="hover:text-foreground">
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings.address && (
                <li className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" />
                  <span>{settings.address}</span>
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              <Link href="/contact" className="underline underline-offset-4 hover:text-foreground">
                Get in touch
              </Link>
            </p>
          )}
          {hasSocial && (
            <div className="mt-4 flex items-center gap-4 text-sm">
              {settings.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Facebook
                </a>
              )}
              {settings.linkedinUrl && (
                <a
                  href={settings.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  LinkedIn
                </a>
              )}
              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Instagram
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        {`© ${new Date().getFullYear()} ${settings.companyName}`}
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Run `pnpm dev`, open `http://localhost:3000`, scroll to the footer. Expected: Sand-tinted background, dark headings, muted body/links that darken on hover, Ocean Blue anchor icon. Toggle dark mode — footer background/text adapt correctly with no unreadable contrast.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/footer.tsx
git commit -m "Migrate footer off hardcoded navy/gold classes"
```

---

### Task 13: Plan A final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS with zero errors.

- [ ] **Step 2: Full browser QA — light mode, desktop**

Run `pnpm dev`. Visit `/` (marketing home), `/services`, `/contact`, `/login`, then log in and visit `/dashboard`, `/dashboard/customers`, `/dashboard/finance`. Confirm: consistent Ocean Blue/Navy/Seafoam palette throughout, no leftover gold except on `hero.tsx`/login form (expected — out of scope until the Marketing+Auth plan), sidebar active states are Seafoam-tinted, badges/buttons/cards look cohesive.

- [ ] **Step 3: Full browser QA — dark mode**

Click the theme toggle (available in both navbar and dashboard topbar). Repeat the same page walkthrough from Step 2. Confirm every page is legible with sufficient contrast — pay particular attention to muted-foreground text on `muted`/`secondary` backgrounds, and badge/alert variants.

- [ ] **Step 4: Responsive QA**

Resize the browser to 375px (mobile), 768px (tablet), and 1280px+ (desktop) for both the marketing navbar and the dashboard sidebar/topbar. Confirm the marketing mobile sheet and dashboard mobile drawer both open correctly and are styled consistently with the rest of the redesign.

- [ ] **Step 5: Confirm no unintended business-logic changes**

Run: `git diff main --stat` (or `git log --stat` over this plan's commits) and confirm the changed-file list matches exactly the files touched by Tasks 1–12 above — no `actions.ts`, Prisma, `auth.ts`, or `middleware.ts` files appear.

- [ ] **Step 6: Final commit (if any QA fixes were made)**

```bash
git add -A
git commit -m "Fix visual issues found in Plan A cross-browser QA pass"
```

(Skip this step if Steps 2–4 found no issues needing fixes.)
