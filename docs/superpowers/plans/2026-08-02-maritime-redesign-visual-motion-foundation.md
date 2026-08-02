# Maritime Redesign — Plan C: Visual & Motion Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the new visual/motion layer from the addendum spec — a custom SVG logomark, theme-aware animated backgrounds (light sky / dark night sky), a reusable wave-divider component, a glassmorphism utility class, and a native cross-page view-transition — and wire the backgrounds into the marketing and dashboard layouts. This is Plan C of the maritime redesign; Plans A (foundation/nav shell) and B (dashboard-core) are already merged to `master`. Plans D (marketing+auth) and E (finance) resume next and will consume the pieces this plan builds.

**Architecture:** Everything here is CSS-only motion (`transform`/`opacity`, GPU-composited) with zero animation-related JavaScript — no canvas, no particle library, no scroll-event listeners. Theme switching (light/dark sky) reuses the same `dark:` Tailwind-variant technique Plan A's `ThemeToggle` already uses, so there's no theme-detection hook and no hydration risk. `WaveDivider` and the `.glass-panel` utility are built and verified in isolation here (same pattern Plan A used for `EmptyState`/`StatCard`/`Alert` — build now, adopt into real page content in Plan D).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, `lucide-react`. No new dependencies.

## Global Constraints

- No changes to server actions, Prisma schema, `auth.ts`, `middleware.ts`, or validation schemas.
- No new dependencies — no canvas library, no particle library, no animation library. Every animation is plain CSS.
- Every animation must use only `transform`/`opacity` (GPU-composited properties) and must be wrapped so it's disabled under `prefers-reduced-motion: reduce`.
- No negative `z-index` anywhere in this plan — background layers rely on DOM order (rendered as the first child of their layout) to sit behind subsequent content, which is simpler and avoids stacking-context bugs.
- Verification is `pnpm typecheck` + `pnpm lint` (both zero errors) + a browser check per task. Where a new component has no consumer yet, verify with a temporary render that is reverted before committing (never leave debug code in the commit) — same convention Plan A established.
- Commit after every task.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/shared/logo-mark.tsx` (new) | Custom SVG maritime logomark, replaces the generic Anchor icon |
| `src/components/shared/navbar.tsx`, `footer.tsx`, `sidebar.tsx` | Swap `<Anchor>` for `<LogoMark>` |
| `src/components/shared/animated-sky.tsx` (new) | Theme-aware animated background (light sky / dark night sky) |
| `src/app/globals.css` | New keyframes/motion classes, `.glass-panel` utility, `@view-transition` rule |
| `src/app/(marketing)/layout.tsx` | Wire in `<AnimatedSky variant="full" />` |
| `src/components/shared/dashboard-layout.tsx` | Wire in `<AnimatedSky variant="subtle" />` |
| `src/components/shared/wave-divider.tsx` (new) | Reusable SVG section-divider component |

---

### Task 1: Custom logomark

**Files:**
- Create: `src/components/shared/logo-mark.tsx`
- Modify: `src/components/shared/navbar.tsx:5,32`
- Modify: `src/components/shared/footer.tsx:2,23`
- Modify: `src/components/shared/sidebar.tsx:6,65`

**Interfaces:**
- Produces: `LogoMark({ className?: string })` — a drop-in replacement for the `Anchor` icon, same `className`/sizing conventions (`size-6` etc.), `currentColor`-based so it inherits whatever text color it's placed in.

- [ ] **Step 1: Create the logomark component**

```tsx
// src/components/shared/logo-mark.tsx
import type { ComponentProps } from "react";

export function LogoMark(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="11" r="8.25" />
      <circle cx="12" cy="6.25" r="1.25" />
      <path d="M12 7.5v10" />
      <path d="M9 10h6" />
      <path d="M7.5 14a4.5 4.5 0 0 0 9 0" />
      <path d="M5 20c1.2-.8 2.4-.8 3.6 0s2.4.8 3.6 0 2.4-.8 3.6 0 2.4.8 3.6 0" />
    </svg>
  );
}
```

This draws, within a 24×24 viewBox (same convention as `lucide-react` icons, so existing `size-6` etc. classes work unchanged): an outer compass-ring circle, a small ring at the anchor's eye, the vertical shank, the horizontal stock (crossbar), a downward arc for the flukes, and a small wave-crest squiggle beneath the ring. `stroke="currentColor"` means it inherits color from whatever `text-*` class is applied via `className`, exactly like the `Anchor` icon it replaces.

- [ ] **Step 2: Replace `Anchor` with `LogoMark` in navbar.tsx**

Change line 5 from:
```tsx
import { Anchor, Menu } from "lucide-react";
```
to:
```tsx
import { Menu } from "lucide-react";
import { LogoMark } from "@/components/shared/logo-mark";
```

Change line 32 from:
```tsx
          <Anchor className="size-6 text-primary" aria-hidden />
```
to:
```tsx
          <LogoMark className="size-6 text-primary" aria-hidden />
```

- [ ] **Step 3: Replace `Anchor` with `LogoMark` in footer.tsx**

Change line 2 from:
```tsx
import { Anchor, Mail, Phone, MapPin } from "lucide-react";
```
to:
```tsx
import { Mail, Phone, MapPin } from "lucide-react";
import { LogoMark } from "@/components/shared/logo-mark";
```

Change line 23 from:
```tsx
            <Anchor className="size-6 text-primary" aria-hidden />
```
to:
```tsx
            <LogoMark className="size-6 text-primary" aria-hidden />
```

- [ ] **Step 4: Replace `Anchor` with `LogoMark` in sidebar.tsx**

In the `lucide-react` import block (around line 6), remove `Anchor,` from the import list and add, right after the `lucide-react` import block:
```tsx
import { LogoMark } from "@/components/shared/logo-mark";
```

Change line 65 from:
```tsx
        <Anchor className="size-6 text-sidebar-primary" aria-hidden />
```
to:
```tsx
        <LogoMark className="size-6 text-sidebar-primary" aria-hidden />
```

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS. If `Anchor` is still imported anywhere else in the codebase (it isn't per the current codebase, but double-check with a search), leave those alone — this task only touches the three files above.

Visual check: start the dev server, view the marketing homepage (logo in navbar and footer) and the dashboard (logo in sidebar) in a browser if available. Confirm the compass-ring+anchor+wave mark renders cleanly at `size-6`, in both light and dark mode, and inherits the correct color in each context (Ocean Blue on navbar/footer, Seafoam in the dark sidebar). If browser access isn't available, a curl-based non-crash check (200/307, not 500) on `/` and `/dashboard` plus careful self-review of the SVG markup is the fallback.

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/logo-mark.tsx src/components/shared/navbar.tsx src/components/shared/footer.tsx src/components/shared/sidebar.tsx
git commit -m "Add custom maritime logomark, replace generic Anchor icon"
```

---

### Task 2: AnimatedSky component

**Files:**
- Create: `src/components/shared/animated-sky.tsx`
- Modify: `src/app/globals.css` (append new section)

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`; the `--brand-mist`/`--brand-sand`/`--brand-deep-sea`/`--brand-harbor` tokens (already registered as Tailwind utilities `mist`/`sand`/`deep-sea`/`harbor` via Plan A's `@theme inline` block — no new tokens needed).
- Produces: `AnimatedSky({ variant?: "full" | "subtle" })`, default `variant = "full"` — consumed by Task 3 (marketing + dashboard layouts). Must be rendered as the **first child** of its parent (no `z-index` — relies on DOM order to sit behind later siblings).

- [ ] **Step 1: Append the motion CSS to `src/app/globals.css`**

Add this new section at the end of the file, after the existing `@layer base { ... }` block:

```css

/* AnimatedSky keyframes and motion classes — GPU-composited (transform/opacity
   only). Disabled entirely under prefers-reduced-motion, per WCAG 2.2 motion
   guidance: users get the same colors/gradients, fully static. */
@keyframes sky-drift {
  from {
    transform: translateX(-4%);
  }
  to {
    transform: translateX(4%);
  }
}

@keyframes sky-glow-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.85;
  }
}

@keyframes star-twinkle {
  0%,
  100% {
    opacity: 0.15;
  }
  50% {
    opacity: 1;
  }
}

.sky-cloud {
  animation: sky-drift 80s ease-in-out infinite alternate;
}

.sky-glow {
  animation: sky-glow-pulse 100s ease-in-out infinite;
}

.star-dot {
  animation: star-twinkle 4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .sky-cloud,
  .sky-glow,
  .star-dot {
    animation: none;
  }
}

/* Subtle scroll-linked parallax on the sky background. Progressive
   enhancement only — browsers without scroll-driven animation support
   simply never apply it, no fallback code needed. */
@keyframes sky-parallax-shift {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(2%);
  }
}

@supports (animation-timeline: scroll()) {
  .sky-parallax {
    animation: sky-parallax-shift linear both;
    animation-timeline: scroll(root block);
  }
}
```

- [ ] **Step 2: Create the component**

```tsx
// src/components/shared/animated-sky.tsx
import { cn } from "@/lib/utils";

const CLOUDS = [
  { top: "10%", left: "-10%", size: "18rem", delay: "0s", duration: "80s" },
  { top: "30%", left: "50%", size: "22rem", delay: "-20s", duration: "95s" },
  { top: "55%", left: "10%", size: "16rem", delay: "-40s", duration: "70s" },
] as const;

const STARS = [
  { top: "12%", left: "20%", delay: "0s" },
  { top: "22%", left: "70%", delay: "0.5s" },
  { top: "35%", left: "40%", delay: "1s" },
  { top: "18%", left: "85%", delay: "1.5s" },
  { top: "48%", left: "15%", delay: "2s" },
  { top: "60%", left: "60%", delay: "0.8s" },
  { top: "70%", left: "30%", delay: "1.3s" },
  { top: "40%", left: "90%", delay: "1.8s" },
] as const;

export function AnimatedSky({ variant = "full" }: { variant?: "full" | "subtle" }) {
  const subtle = variant === "subtle";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "sky-parallax pointer-events-none fixed inset-0 overflow-hidden",
        subtle ? "opacity-40" : "opacity-100"
      )}
    >
      {/* Light sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-mist to-sand dark:hidden">
        <div className="sky-glow absolute -top-20 right-[10%] size-96 rounded-full bg-white/60 blur-3xl" />
        {!subtle &&
          CLOUDS.map((cloud, i) => (
            <div
              key={i}
              className="sky-cloud absolute rounded-full bg-white/50 blur-3xl"
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

      {/* Dark night sky */}
      <div className="absolute inset-0 hidden bg-gradient-to-b from-deep-sea to-background dark:block">
        <div className="sky-glow absolute -top-16 left-[15%] size-80 rounded-full bg-harbor/20 blur-3xl" />
        {STARS.map((star, i) => (
          <div
            key={i}
            className="star-dot absolute size-1 rounded-full bg-white"
            style={{ top: star.top, left: star.left, animationDelay: star.delay }}
          />
        ))}
        {!subtle &&
          CLOUDS.slice(0, 2).map((cloud, i) => (
            <div
              key={`dark-${i}`}
              className="sky-cloud absolute rounded-full bg-white/5 blur-3xl"
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
    </div>
  );
}
```

Note the deliberate choices: all cloud/star positions are a fixed, hardcoded array (not `Math.random()`) — this keeps server and client render output identical, so there's no hydration mismatch. `dark:hidden` / `hidden dark:block` is the same CSS-only theme-switching technique `ThemeToggle` already uses (Plan A) — no JavaScript theme detection.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

This component has no consumer yet (Task 3 wires it in). Temporarily render `<AnimatedSky />` at the top of `src/app/(marketing)/page.tsx`'s returned JSX (before `<Hero />`), start `pnpm dev`, view the homepage. Expected: a soft blue gradient sky with slowly drifting blurred cloud shapes fills the background behind the (opaque) page content. Toggle dark mode — confirm it switches to the navy gradient with twinkling star dots and a moon-glow, with no flash of the wrong sky and no console errors. Then temporarily render `<AnimatedSky variant="subtle" />` the same way and confirm it's visibly fainter and the clouds/particles are absent. Revert both temporary renders completely before committing (verify with `git status` that only `animated-sky.tsx` and `globals.css` are new/changed).

If you have OS-level access to toggle "reduce motion" (Windows: Settings → Accessibility → Visual effects → Animation effects off; macOS: System Settings → Accessibility → Display → Reduce motion), confirm the clouds/stars/glow stop animating (colors stay, motion stops) with that setting on. If you can't toggle the OS setting, confirm via devtools: Chrome DevTools → Rendering tab → "Emulate CSS media feature prefers-reduced-motion: reduce."

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/animated-sky.tsx src/app/globals.css
git commit -m "Add AnimatedSky component with theme-aware light/dark backgrounds"
```

---

### Task 3: Wire AnimatedSky into the marketing and dashboard layouts

**Files:**
- Modify: `src/app/(marketing)/layout.tsx`
- Modify: `src/components/shared/dashboard-layout.tsx`

**Interfaces:**
- Consumes: `AnimatedSky` from `@/components/shared/animated-sky` (Task 2).

- [ ] **Step 1: Wire into the marketing layout**

Replace the full contents of `src/app/(marketing)/layout.tsx`:

```tsx
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { OrganizationJsonLd } from "@/components/shared/organization-jsonld";
import { AnimatedSky } from "@/components/shared/animated-sky";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <AnimatedSky variant="full" />
      <OrganizationJsonLd />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

`AnimatedSky` must stay the first child — it relies on DOM order (not `z-index`) to render behind everything that follows.

- [ ] **Step 2: Wire into the dashboard layout**

In `src/components/shared/dashboard-layout.tsx`, add the import:

```tsx
import { AnimatedSky } from "@/components/shared/animated-sky";
```

Change the returned JSX's outer `<div>` from:

```tsx
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 print:hidden md:block">
```

to:

```tsx
    <div className="flex min-h-screen">
      <AnimatedSky variant="subtle" />
      <aside className="hidden w-64 shrink-0 print:hidden md:block">
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Start `pnpm dev`, view the marketing homepage: confirm the animated sky is now visible in the page's margins/gaps (behind the sticky navbar's blur, behind any transparent areas) in both light and dark mode, at full intensity. Then log in and view `/dashboard`: confirm a much fainter version of the same sky is visible in the page background around the cards/tables, not competing with the data. Confirm nothing regressed — sidebar, topbar, and all existing content still render normally on top of the background.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(marketing)/layout.tsx" src/components/shared/dashboard-layout.tsx
git commit -m "Wire AnimatedSky into marketing and dashboard layouts"
```

---

### Task 4: WaveDivider component

**Files:**
- Create: `src/components/shared/wave-divider.tsx`

**Interfaces:**
- Produces: `WaveDivider({ className?: string, fillClassName?: string })`, `fillClassName` default `"fill-background"` — consumed by Plan D's marketing page content (not used anywhere in this plan).

- [ ] **Step 1: Create the component**

```tsx
// src/components/shared/wave-divider.tsx
import { cn } from "@/lib/utils";

export function WaveDivider({
  className,
  fillClassName = "fill-background",
}: {
  className?: string;
  fillClassName?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("w-full overflow-hidden leading-none", className)}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="h-16 w-full sm:h-20">
        <path
          d="M0,32 C240,80 480,0 720,24 C960,48 1200,80 1440,32 L1440,80 L0,80 Z"
          className={fillClassName}
        />
      </svg>
    </div>
  );
}
```

`fillClassName` lets the caller pick which background token the curve should match (e.g. `fill-muted` when the divider sits above a `bg-muted` section), so it blends as "the page surface curving" rather than introducing a new color.

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

This component has no consumer yet (Plan D adopts it). Temporarily render `<WaveDivider />` and `<WaveDivider fillClassName="fill-muted" />` stacked on top of each other somewhere on the marketing homepage (e.g. right after `<Hero />`), start `pnpm dev`, view the homepage. Expected: a smooth, single-crest curve spanning the full width, filled with the background/muted color respectively — no visible seams or gaps at the edges. Revert the temporary render completely before committing.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/wave-divider.tsx
git commit -m "Add reusable WaveDivider component"
```

---

### Task 5: Glassmorphism utility class + native view-transition

**Files:**
- Modify: `src/app/globals.css` (append)

- [ ] **Step 1: Append to `src/app/globals.css`**

```css

/* Reusable frosted-glass accent for sparing use on marketing hero/CTA
   moments — not a default Card variant, not used in the dashboard. */
.glass-panel {
  @apply bg-card/60 ring-1 ring-foreground/10 backdrop-blur-md;
}

/* Native browser cross-page fade transition for App Router navigations.
   No JavaScript; browsers without View Transitions API support simply
   ignore this at-rule (standard CSS error-tolerant parsing), no fallback
   code needed. */
@view-transition {
  navigation: auto;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Temporarily add `className="glass-panel"` to some element on the marketing homepage (e.g. wrap a bit of text in a `<div className="glass-panel p-4">Test</div>` right after `<Hero />`), start `pnpm dev`, view the homepage with the `AnimatedSky` visible behind it (from Task 3). Expected: the element shows a translucent, blurred card surface with the animated sky faintly visible through it. Revert the temporary element before committing.

For the view-transition rule: start `pnpm dev` in a Chromium-based browser if available, click a navbar link (e.g. Home → About), and check whether the page cross-fades instead of hard-cutting. This is a nice-to-confirm, not a hard requirement — the rule is inert (and harmless) on browsers/environments where it isn't supported, so if you can't visually confirm it, just confirm `pnpm typecheck && pnpm lint` pass and the CSS is syntactically valid (no build errors from `pnpm dev`'s output).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "Add glassmorphism utility class and native view-transition rule"
```

---

### Task 6: Plan C final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS with zero errors.

- [ ] **Step 2: Full browser QA — light and dark mode**

Visit the marketing homepage and at least one other marketing page (e.g. `/about`) in both light and dark mode: confirm the logomark renders correctly in the navbar and footer, the animated sky is visible and animating (or static under reduced-motion) at full intensity, and nothing looks broken or misaligned. Log in and visit `/dashboard`: confirm the logomark renders in the sidebar and the subtle sky variant is visible without competing with dashboard content.

- [ ] **Step 3: Responsive check**

Resize to mobile width (375px) and tablet width (768px) for the marketing homepage. Confirm the animated sky still covers the viewport correctly (no gaps, no overflow-caused horizontal scrollbar) and the logomark stays crisp at its rendered size.

- [ ] **Step 4: Confirm no unintended scope**

Run `git log --stat` over this plan's commit range and confirm the changed-file list matches exactly the files in this plan's File Structure table — no server actions, schema, auth, or middleware files, and no marketing *page content* files touched (Task 2/4/5's temporary renders must all have been reverted — `git diff` on `src/app/(marketing)/page.tsx` across this plan's full range should show no net changes from this plan, since it was only ever used as a scratch verification surface).

- [ ] **Step 5: Final commit (if any QA fixes were made)**

```bash
git add -A
git commit -m "Fix visual issues found in Plan C cross-browser QA pass"
```

(Skip this step if Steps 2–3 found no issues needing fixes.)
