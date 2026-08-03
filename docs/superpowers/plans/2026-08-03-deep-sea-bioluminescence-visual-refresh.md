# Deep Sea Bioluminescence Visual Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-tune the existing maritime design-token system to a "Deep Sea Bioluminescence" palette (near-black teal-navy base, glowing cyan/violet accents), make the marketing hero/CTA always render the dark bioluminescent look regardless of the visitor's theme, and keep the dashboard on a calm toned-down companion by default with full glow behind its own dark-mode toggle.

**Architecture:** This is a token-value retune on the semantic system Plans A–D already built, plus two consumer-routing changes (`AnimatedSky`, `Hero`) that reuse Plan D's existing `--sidebar`-family "always dark, both modes" pattern rather than inventing anything new. `WaveDivider`, `.glass-panel`, `LogoMark`, and every existing Plan D consumer of `bg-sidebar`/`text-sidebar-foreground` (Industries Served, the homepage final CTA, `contact-cta.tsx`, About's values section, the login split panel) are entirely token-driven and need zero code changes — they pick up the new colors automatically once the tokens retune.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4. No new dependencies.

## Global Constraints

- No changes to server actions, Prisma schema, `auth.ts`, `middleware.ts`, or validation schemas.
- No new CSS custom properties beyond what Plans A–D already defined — this plan only changes existing token *values* plus routes `Hero` onto the existing `--sidebar`-family tokens.
- No new dependencies. Motion stays CSS-only; `AnimatedSky`'s existing `prefers-reduced-motion` handling in `globals.css` is untouched.
- **Hard safety rule:** `--foreground` must always stay paired with `--background` in the same mode (never crossed), and `--card`/`--card-foreground`, `--muted`/`--muted-foreground`, `--secondary`/`--secondary-foreground` must each remain internally consistent independently. Do not flip `--foreground` globally to fix a contrast problem — give the specific surface that needs light text an explicit `--sidebar`-family override instead, exactly as this plan does for `Hero`.
- Dashboard `Card`/`Table`/form components are not touched beyond the `--chart-*` value retune (no code changes to those files) — Plan D's existing `text-foreground`/`text-muted-foreground` usage inside them stays exactly as-is.
- Verification is `pnpm typecheck` + `pnpm lint` (both zero errors) + a browser check per task. Commit after every task.

---

## File Structure

| File | Change |
|---|---|
| `src/app/globals.css` | Retune `:root`, `.dark`, `--sidebar`-family, `--chart-*`, and `--brand-ocean`/`--brand-harbor` values |
| `src/components/shared/animated-sky.tsx` | Restructure: `variant="full"` always renders the bioluminescent scene (drops its `dark:` conditional); `variant="subtle"` keeps switching between a toned teal wash (light) and the bioluminescent scene (dark) |
| `src/components/shared/hero.tsx` | Route eyebrow badge, heading, subtitle, and both CTA buttons onto `--sidebar`-family tokens |
| `src/components/shared/wave-divider.tsx`, `.glass-panel` (`globals.css`), `src/components/shared/logo-mark.tsx` | No code change — token-driven, verified in Task 4 |
| `src/app/dashboard/bookings/booking-calendar.tsx`, `src/app/dashboard/calendar/schedule-calendar.tsx` | No code change expected — status/type dot distinctness re-verified in Task 4 after the token retune (their raw `bg-navy`/`bg-ocean`/`bg-accent`/`bg-success` classes cascade automatically) |
| `src/app/dashboard/reports/report-charts.tsx`, `src/app/dashboard/finance/finance-charts.tsx` | No code change — already reference `var(--chart-1..5)`, retuned in Task 1 |

---

### Task 1: Retune design tokens

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: every semantic token (`--background`, `--foreground`, `--primary`, `--accent`, `--sidebar*`, `--chart-1..5`) at its new value, consumed by every existing component unchanged. `--sidebar`-family values are now identical in light and dark mode (already true for `--sidebar-primary` today; extended to the rest of the family) — this is what Task 3's `Hero` routing and every existing Plan D "inverted block" consumer relies on to look correct regardless of theme.

- [ ] **Step 1: Update the raw `--brand-*` block**

In the first `:root { ... }` block (raw brand palette, currently lines 11-20), change:
```css
  --brand-ocean: #38f0d8;
  --brand-harbor: #6fe8d4;
```
(was `--brand-ocean: #1565c0;` and `--brand-harbor: #4a90e2;`). Leave every other line in this block (`--brand-navy`, `--brand-deep-sea`, `--brand-seafoam`, `--brand-coral`, `--brand-mist`, `--brand-sand`) unchanged.

- [ ] **Step 2: Update the light-mode `:root` block**

In the second `:root { ... }` block (currently lines 76-111), replace it entirely with:
```css
:root {
  --background: #f4f8f8;
  --foreground: #0d2b30;
  --card: #ffffff;
  --card-foreground: #0d2b30;
  --popover: #ffffff;
  --popover-foreground: #0d2b30;
  --primary: #0d9488;
  --primary-foreground: #ffffff;
  --secondary: #e7f3f2;
  --secondary-foreground: #0d2b30;
  --muted: #eef3f2;
  --muted-foreground: #5c7a7d;
  --accent: #6d5ce6;
  --accent-foreground: #ffffff;
  --destructive: #e63946;
  --success: #2ecc71;
  --warning: #f4b400;
  --border: #d9e6e5;
  --input: #d9e6e5;
  --ring: #0d9488;
  --chart-1: #38f0d8;
  --chart-2: #7b6ef6;
  --chart-3: #ff6b6b;
  --chart-4: #0d9488;
  --chart-5: #f4b400;
  --radius: 0.625rem;
  --sidebar: #051419;
  --sidebar-foreground: #eafaf8;
  --sidebar-primary: #38f0d8;
  --sidebar-primary-foreground: #051419;
  --sidebar-accent: #0d3540;
  --sidebar-accent-foreground: #eafaf8;
  --sidebar-border: #0d3540;
  --sidebar-ring: #38f0d8;
}
```

- [ ] **Step 3: Update the `.dark` block**

Replace the `.dark { ... }` block (currently lines 113-147) entirely with:
```css
.dark {
  --background: #051419;
  --foreground: #eafaf8;
  --card: #0a2530;
  --card-foreground: #eafaf8;
  --popover: #0a2530;
  --popover-foreground: #eafaf8;
  --primary: #38f0d8;
  --primary-foreground: #051419;
  --secondary: #0d3540;
  --secondary-foreground: #eafaf8;
  --muted: #0a2530;
  --muted-foreground: #8fb0ae;
  --accent: #7b6ef6;
  --accent-foreground: #051419;
  --destructive: #e63946;
  --success: #2ecc71;
  --warning: #f4b400;
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: #7b6ef6;
  --chart-1: #38f0d8;
  --chart-2: #7b6ef6;
  --chart-3: #ff6b6b;
  --chart-4: #f4b400;
  --chart-5: #8fd8cf;
  --sidebar: #020d10;
  --sidebar-foreground: #eafaf8;
  --sidebar-primary: #38f0d8;
  --sidebar-primary-foreground: #051419;
  --sidebar-accent: #0a2530;
  --sidebar-accent-foreground: #eafaf8;
  --sidebar-border: oklch(1 0 0 / 8%);
  --sidebar-ring: #38f0d8;
}
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS (this task only changes CSS custom-property values, not any TypeScript/JSX, so this is primarily a safety net — it should be a no-op on both).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "Retune design tokens to Deep Sea Bioluminescence palette"
```

---

### Task 2: Restructure AnimatedSky for the always-dark marketing hero

**Files:**
- Modify: `src/components/shared/animated-sky.tsx`

**Interfaces:**
- Consumes: `--sidebar`, `--sidebar-accent`, `--sidebar-primary`, `--accent`, `--secondary`, `--background` (all retuned in Task 1).
- Produces: `AnimatedSky({ variant?: "full" | "subtle" })` — same public signature as before. `variant="full"` (used by the `(marketing)` layout) now always renders the bioluminescent scene, ignoring the visitor's light/dark preference. `variant="subtle"` (used by `DashboardLayout`) keeps switching: toned teal wash in light mode, bioluminescent scene in dark mode.

- [ ] **Step 1: Replace the component**

Replace the full contents of `src/components/shared/animated-sky.tsx` with:

```tsx
import { cn } from "@/lib/utils";

const CLOUDS = [
  { top: "10%", left: "-10%", size: "18rem", delay: "0s", duration: "80s" },
  { top: "30%", left: "50%", size: "22rem", delay: "-20s", duration: "95s" },
  { top: "55%", left: "10%", size: "16rem", delay: "-40s", duration: "70s" },
] as const;

const GLOW_DOTS = [
  { top: "12%", left: "20%", delay: "0s" },
  { top: "22%", left: "70%", delay: "0.5s" },
  { top: "35%", left: "40%", delay: "1s" },
  { top: "18%", left: "85%", delay: "1.5s" },
  { top: "48%", left: "15%", delay: "2s" },
  { top: "60%", left: "60%", delay: "0.8s" },
  { top: "70%", left: "30%", delay: "1.3s" },
  { top: "40%", left: "90%", delay: "1.8s" },
] as const;

function BioluminescentScene({ subtle }: { subtle: boolean }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-sidebar to-sidebar-accent">
      <div className="sky-glow absolute -top-16 left-[15%] size-80 rounded-full bg-sidebar-primary/20 blur-3xl" />
      {GLOW_DOTS.map((dot, i) => (
        <div
          key={i}
          className={cn(
            "star-dot absolute size-1 rounded-full",
            i % 2 === 0 ? "bg-sidebar-primary" : "bg-accent"
          )}
          style={{ top: dot.top, left: dot.left, animationDelay: dot.delay }}
        />
      ))}
      {!subtle &&
        CLOUDS.slice(0, 2).map((cloud, i) => (
          <div
            key={`glow-${i}`}
            className="sky-cloud absolute rounded-full bg-sidebar-primary/5 blur-3xl"
            style={{
              top: cloud.top,
              left: cloud.left,
              width: cloud.size,
              height: cloud.size,
              animationDelay: cloud.delay,
              animationDuration: cloud.duration,
            }}
          />
        ))}
    </div>
  );
}

export function AnimatedSky({ variant = "full" }: { variant?: "full" | "subtle" }) {
  const subtle = variant === "subtle";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "sky-parallax pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        subtle ? "opacity-40" : "opacity-100"
      )}
    >
      {subtle ? (
        <>
          {/* Toned teal wash — dashboard light mode */}
          <div className="absolute inset-0 bg-gradient-to-b from-secondary to-background dark:hidden">
            <div className="sky-glow absolute -top-20 right-[10%] size-96 rounded-full bg-white/60 blur-3xl" />
          </div>
          {/* Full bioluminescent glow — dashboard dark mode */}
          <div className="absolute inset-0 hidden dark:block">
            <BioluminescentScene subtle={subtle} />
          </div>
        </>
      ) : (
        // Marketing: always the bioluminescent scene, regardless of the visitor's theme
        <BioluminescentScene subtle={subtle} />
      )}
    </div>
  );
}
```

This drops the old `from-mist to-sand` light layer and `from-deep-sea to-background` dark layer entirely. `variant="full"` no longer has a `dark:` conditional at all — it's one unconditional `BioluminescentScene`. `variant="subtle"` keeps the exact same two-layer `dark:hidden`/`dark:block` structure as before, just recolored: the light layer's gradient moves from the old `mist`/`sand` raw brand colors onto the new semantic `secondary`/`background` tokens (the "toned teal wash"), and the dark layer reuses the same `BioluminescentScene` the marketing variant shows unconditionally.

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Start `pnpm dev`. View the marketing homepage with the OS/app theme set to light — confirm the background is the dark bioluminescent scene (not a light wash) with cyan/violet glow dots and two faint glow-clouds. Toggle to dark mode — confirm the marketing background looks identical (this proves the `dark:` conditional was actually removed, not just visually coincidental). Then view `/dashboard` in light mode — confirm a pale teal wash (not the dark scene). Toggle dashboard to dark mode — confirm it now shows the same bioluminescent scene as marketing, at the "subtle" lower opacity and without the two glow-clouds (`subtle` suppresses them). Confirm `prefers-reduced-motion: reduce` (via browser dev tools emulation) still freezes all motion on both variants.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/animated-sky.tsx
git commit -m "Make AnimatedSky's full variant always bioluminescent, recolor subtle variant"
```

---

### Task 3: Route Hero onto the always-dark sidebar tokens

**Files:**
- Modify: `src/components/shared/hero.tsx`

**Interfaces:**
- Consumes: `--sidebar-accent`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground` (all retuned in Task 1, identical in both light and dark mode).

- [ ] **Step 1: Apply the 5 changes**

In `src/components/shared/hero.tsx`:

- Eyebrow badge (currently `className="rounded-full bg-secondary px-3 py-1 text-xs font-medium tracking-wide text-foreground uppercase"`) — change to:
  ```
  className="rounded-full bg-sidebar-accent px-3 py-1 text-xs font-medium tracking-wide text-sidebar-foreground uppercase"
  ```
- Heading (currently `className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"`) — change `text-foreground` to `text-sidebar-foreground`.
- Subtitle paragraph (currently `className="max-w-2xl text-lg text-muted-foreground"`) — change `text-muted-foreground` to `text-sidebar-foreground/70` (matches the existing convention Plan D used for secondary text on `bg-sidebar` surfaces elsewhere in the codebase, e.g. `text-white/70` on the About page's values section).
- Primary CTA `Button` (currently no `className`) — add:
  ```
  className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
  ```
  keeping its other props (`size="lg"`, `nativeButton={false}`, `render={...}`) unchanged. This overrides the default `primary` variant, which reads the reactive `--primary`/`--primary-foreground` (daylight teal in light mode) — wrong on this always-dark surface.
- Outline CTA `Button` (currently `variant="outline"`, no `className`) — add:
  ```
  className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10"
  ```
  keeping `variant="outline"` and its other props unchanged. The default outline variant reads `border-border`/`bg-background`/`hover:bg-muted` — all reactive tokens that would be light-mode-light on this always-dark surface, the same class of bug fixed earlier in this project. This override replaces those with sidebar-scoped equivalents.

The full file after these changes:

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6 lg:px-8">
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-full bg-sidebar-accent px-3 py-1 text-xs font-medium tracking-wide text-sidebar-foreground uppercase"
      >
        Independent Marine Consultancy
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-3xl text-4xl font-semibold tracking-tight text-sidebar-foreground sm:text-5xl"
      >
        Professional Marine Consultancy You Can Trust
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-2xl text-lg text-sidebar-foreground/70"
      >
        Providing reliable marine consultation, surveys, inspections, and maritime
        mentoring services with professionalism and international standards.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Button
          size="lg"
          nativeButton={false}
          className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
          render={<Link href="/book-consultation">Book Consultation</Link>}
        />
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10"
          render={<Link href="/contact">Request Quote</Link>}
        />
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

View the marketing homepage in both light and dark mode (should look identical, per Task 2). Confirm: the eyebrow badge is legible (light text on the darker sidebar-accent pill), the heading and subtitle are both clearly legible against the bioluminescent background, the primary button is a filled cyan-glow button with dark text, and the outline button has a visible light border and light text (not invisible, not using a light-mode-light border).

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/hero.tsx
git commit -m "Route Hero onto always-dark sidebar tokens for the bioluminescent hero"
```

---

### Task 4: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS with zero errors.

- [ ] **Step 2: Confirm no leftover references to removed light-sky brand tokens**

Run:
```bash
grep -rn "from-mist\|to-sand\|from-deep-sea" src --include="*.tsx"
```
Expected: no output (Task 2 removed the only two consumers of this gradient pair). If any remain, they were missed by Task 2 and need the same treatment.

- [ ] **Step 3: Dashboard status/type dot distinctness**

Open `/dashboard/bookings` and `/dashboard/calendar` in the browser, both light and dark mode. Visually confirm every status dot (`booking-calendar.tsx`'s `STATUS_DOT`: `NEW`, `REVIEWING`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) and every type dot (`schedule-calendar.tsx`'s `TYPE_DOT`: `CONSULTATION`, `SURVEY`, `INSPECTION`, `TRAINING`, `OTHER`) remains visually distinct from its siblings after the Task 1 token retune (`bg-ocean` and `bg-accent` changed value; `bg-navy`, `bg-success`, `bg-muted-foreground`, `bg-destructive` did not). If any two dots in the same map are no longer distinguishable, remap the colliding one(s) to an unused `bg-chart-N` utility (already available via the `@theme inline` mapping in `globals.css`) that restores distinctness, following the same reasoning Plan D's Task 11 used when it picked `bg-accent` over `bg-primary` for exactly this kind of collision — then re-run Steps 1 and commit that specific fix separately before continuing.

- [ ] **Step 4: Full browser QA — light mode**

Visit every marketing page (`/`, `/about`, `/services`, `/services/[a-real-slug]`, `/projects`, `/projects/[a-real-id]`, `/blog`, `/blog/[a-real-slug]`, `/contact`, `/book-consultation`) and `/login`, plus `/dashboard` and 2-3 other dashboard pages (e.g. `/dashboard/bookings`, `/dashboard/finance`). Confirm: marketing hero/CTA moments render the bioluminescent scene correctly (per Task 2/3), every existing `bg-sidebar` "inverted block" (Industries Served, homepage final CTA, About's values section, login's split panel) renders with the new glow colors and stays legible, and the dashboard renders its calm toned-down surface with legible cards/tables/charts.

- [ ] **Step 5: Full browser QA — dark mode**

Toggle dark mode and repeat the same walkthrough. Marketing pages should look unchanged from light mode (per Task 2's always-dark hero). Dashboard should now show the full bioluminescent glow treatment throughout, still legible in cards/tables/charts.

- [ ] **Step 6: Responsive check**

Resize to mobile width (375px) for the homepage, `/contact`, `/login`, and `/dashboard`. Confirm layouts still work and text remains legible at every breakpoint.

- [ ] **Step 7: Explicit contrast spot-check**

Using browser dev tools' computed-style inspection (not just visual glance), verify contrast on: the Hero heading/eyebrow/subtitle/both buttons (against the bioluminescent background), one `bg-sidebar`-family inverted block's heading text, and 2-3 dashboard page-title `<h1>` elements against the dashboard's new light-mode `--background`. This is the exact failure class (text sitting directly on a background, not inside a `Card`) that broke during an earlier, aborted background-color change this session — confirm it has not recurred.

- [ ] **Step 8: Final commit (if any QA fixes were made)**

```bash
git add -A
git commit -m "Fix visual issues found in Deep Sea Bioluminescence QA pass"
```

(Skip this step if Steps 3-7 found no issues needing fixes.)
