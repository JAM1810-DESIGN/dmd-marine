# Maritime Redesign — Visual & Motion Addendum

Date: 2026-08-02
Status: Approved by user, ready for implementation planning
Relationship to prior spec: this is an **addendum** to `2026-08-02-maritime-redesign-design.md` (the original 5-plan spec). Plans A (foundation/nav shell) and B (dashboard-core) from that spec are complete and merged. This addendum covers genuinely new material — animated backgrounds, wave dividers, glassmorphism, a custom logomark, parallax/motion polish, performance, and accessibility — that was not in the original spec. It does **not** re-specify the marketing/finance/auth page redesigns; those remain governed by the original spec and resume as Plans D and E (see Sequencing below). This document supersedes the earlier decision to abort those plans — they are back in scope.

## Goal

Add a premium visual/motion layer (animated theme-aware backgrounds, wave section dividers, sparing glassmorphism, a custom maritime logomark, subtle scroll motion) on top of the existing token/component system, then close out the redesign with a dedicated performance pass and a dedicated accessibility pass — all without regressing functionality or introducing JS-driven animation overhead.

## Non-goals / Guardrails

- No canvas, no particle-animation library, no per-frame JavaScript. All motion is CSS-only (`transform`/`opacity`, GPU-composited), so `prefers-reduced-motion` support is inherent rather than bolted on.
- No new logo asset pipeline (no external image generation) — the logomark is authored as inline SVG (geometric primitives: circle + paths), not a generated/imported image file.
- Glassmorphism is a narrow, deliberate accent on specific marketing hero/CTA moments — not a new default `Card` variant, not used in the dashboard.
- Animated backgrounds run full-intensity on marketing pages only; dashboard pages get a `variant="subtle"` version (low opacity, little/no motion) so data-dense screens stay legible.
- Performance and accessibility work is audit-driven: the concrete fix list isn't fully known until the audit tooling runs against the built app. The audit *method* and *acceptance bar* are specified here; the specific fixes get enumerated when the plan is written, after running the tools.
- Same stack, no new dependencies beyond what's already installed (Next.js, Tailwind 4, Base UI, `framer-motion` if genuinely needed for something CSS can't do — expected not to be needed given the CSS-only approach).

## 1. Animated Background System

### Component

`src/components/shared/animated-sky.tsx` — a server component (no `"use client"`, no hooks). Renders both a light-mode layer and a dark-mode layer as sibling elements; visibility is controlled purely by Tailwind's `dark:` variant classes (`dark:hidden` / `hidden dark:block`), the same technique already used for `ThemeToggle`'s icon swap — no theme-detection JavaScript, no hydration mismatch risk.

```tsx
export function AnimatedSky({ variant = "full" }: { variant?: "full" | "subtle" }) {
  // variant="full": marketing pages. variant="subtle": dashboard layout.
  // Renders a fixed, full-viewport, negative-z-index background:
  // - light layer: sky gradient + 3-4 blurred drifting "cloud" shapes + one radial "sun glow"
  // - dark layer: navy gradient + a handful of twinkling "star" dots + one radial "moon glow"
  // All layers pointer-events: none, aria-hidden, and only render :root-level color-driven
  // shapes (no imagery) so there's nothing to lazy-load or optimize as an asset.
}
```

### Light sky layer

- Base: `linear-gradient` from `--brand-mist` toward a slightly warmer near-white/`--brand-sand` tone at the "horizon" (bottom of the fixed layer).
- 3–4 soft, heavily-blurred (`filter: blur(40px)` or Tailwind `blur-3xl`) circular shapes in white/mist at low opacity (`opacity-30`–`opacity-40`), each with its own `translateX` keyframe loop, 60–90s duration, `ease-in-out`, alternating direction — reads as slow-drifting clouds without any recognizable cloud shape needed (soft blur does the work).
- One radial gradient in an upper corner (warm, low-saturation glow) with a very slow `opacity` pulse (90–120s) for the "gentle sunlight glow."

### Dark night sky layer

- Base: `linear-gradient` from `--brand-deep-sea` toward a near-black navy.
- 8–12 small (2–3px) dot shapes (`box-shadow`-based star field, generated via a repeating CSS pattern or a fixed small set of positioned divs — no JS random placement, so the layout is deterministic and won't cause hydration mismatches) with a staggered `opacity` pulse keyframe (`animation-delay` varied per star) for a "twinkle" effect.
- One radial gradient (cool, low-saturation) for "moonlight glow," slow opacity pulse.
- 1–2 of the same blurred-circle shapes from the light layer, present at much lower opacity, slowly drifting — the "animated particles."

### Performance & accessibility (built in, not bolted on)

- Every keyframe animates only `transform` and/or `opacity` — the two properties the browser compositor can animate without triggering layout or paint, which is what keeps this GPU-accelerated and cheap regardless of how many shapes are animating.
- All `animation` declarations are scoped inside `@media (prefers-reduced-motion: no-preference)`. Users with reduced-motion set see the same gradient/color composition, fully static — this satisfies WCAG 2.2's motion requirement for free, with no separate reduced-motion code path to maintain.
- `position: fixed; inset: 0; z-index: -1; pointer-events: none; aria-hidden="true"` — never intercepts clicks, never announced to screen readers, never part of tab order.

### Placement

- `variant="full"`: rendered once in the `(marketing)` route group's layout, behind `{children}`.
- `variant="subtle"`: rendered in `DashboardLayout` (`src/components/shared/dashboard-layout.tsx`), behind the sidebar+content area. Subtle means: opacity dropped by roughly half again, cloud/star drift animation either removed or slowed to 3–4x the marketing duration — the goal is a faint ambient wash, not a competing visual element behind tables and forms.

## 2. Wave Dividers, Glassmorphism, Logomark

### Wave dividers

`src/components/shared/wave-divider.tsx` — a small component rendering one SVG `<path>` describing a gentle, single-crest curve, full viewport width, positioned at a section boundary. The `fill` is the *next* section's background token (e.g. `fill-background` or `fill-muted` depending on which section follows), so it reads as the page surface itself curving rather than an added decorative color. Used sparingly on marketing pages — between the Hero and the section below it, and at 1–2 further alternating-background transitions. Not used anywhere in the dashboard.

### Glassmorphism

Applied as direct utility classes at specific call sites — not a new `Card` variant, not a reusable prop — because it's a rare accent, not a pattern: `bg-card/60 backdrop-blur-md ring-1 ring-foreground/10` (or similar) on the hero's stat/highlight strip and the primary marketing CTA card, so the animated sky shows through faintly behind them. Dashboard cards are unaffected.

### Custom logomark

`src/components/shared/logo-mark.tsx` exports `LogoMark({ className? })` — an inline SVG built from geometric primitives (a circular ring outline evoking a compass rose, a simplified anchor silhouette at center, a small wave-crest beneath), using `stroke="currentColor"` / `fill="currentColor"` throughout so it inherits whatever text color it's placed in — no fixed colors baked into the SVG, no separate light/dark asset. This replaces every existing `<Anchor className="..." aria-hidden />` usage (currently in `navbar.tsx`, `footer.tsx`, `sidebar.tsx`) with `<LogoMark className="..." aria-hidden />` at the same call sites, same sizing conventions (`size-6` etc.) — a drop-in replacement, not a layout change.

## 3. Motion Polish, Performance, Accessibility

### Parallax & micro-interactions

- One `animation-timeline: scroll()` rule (wrapped in `@supports` so unsupported browsers simply don't apply it — no fallback JS, no error) applied to the hero's `AnimatedSky` layer for a few pixels of scroll-linked depth movement. Purely additive; absence of support just means no parallax, not broken layout.
- One new global rule in `globals.css`: `@view-transition { navigation: auto; }` — enables the browser's native cross-page fade transition for App Router navigations, zero JavaScript, no-op on unsupported browsers.
- Existing hover/press/skeleton micro-interactions from Plans A/B (`Card interactive`, `Button` press/shadow, `RouteLoadingSkeleton`) are already in place and don't need rework here.

### Performance (audit-driven)

Method: run `next build` and inspect its route/bundle output, then run Lighthouse against the production build. Fix what's found, prioritizing:
- Dynamic-importing (`next/dynamic`) the largest, least-frequently-opened form dialogs (e.g. `project-form-dialog.tsx`, `service-form-dialog.tsx`, both 200+ lines) so their JS isn't in the initial bundle for pages that rarely open them.
- Auditing any `<img>` or Cloudinary-served image usage for `next/image` (automatic optimization/lazy-loading) or, at minimum, explicit `width`/`height` to prevent layout shift.
- Any other oversized chunk or slow route the tooling surfaces.

Acceptance bar: Core Web Vitals (LCP, CLS, INP) in Lighthouse's "Good" range on the production build for the marketing homepage and the dashboard overview (the two heaviest pages).

### Accessibility (audit-driven)

Method: manual pass + automated scan (axe-core or Lighthouse's accessibility category) against the built app. Concrete checks:
- Contrast verification for every token pairing Plan A introduced, especially Seafoam and Coral text-on-color combinations flagged during Plan A's design phase but never formally re-verified.
- Every icon-only button (`size="icon"` `Button` usage) has an `aria-label`.
- Focus-visible rings present and legible on every interactive element, in both themes.
- Keyboard navigation through dialogs/dropdown menus/select components spot-checked (expected to already work via Base UI's built-in a11y, this confirms it).
- Every form input has an associated accessible label.
- `prefers-reduced-motion` is honored everywhere this addendum introduces motion (animated backgrounds, view-transitions, parallax) — verified by toggling the OS setting and confirming stillness.

Acceptance bar: zero critical/serious axe findings on the marketing homepage and dashboard overview; WCAG 2.2 AA contrast ratios on all token pairings.

## 4. Sequencing

Five plans follow Plans A and B, in this order:

1. **Plan C — Visual & motion foundation (this addendum's new material):** `AnimatedSky`, `LogoMark`, `WaveDivider`, the glassmorphism utility pattern, the `@view-transition` rule, and wiring `AnimatedSky` into the marketing and dashboard layouts.
2. **Plan D — Marketing + Auth (resumed from the original spec):** home, about, services, projects, blog, contact, book-consultation, and login — now built using Plan C's pieces (animated sky, wave dividers, glassmorphism, logomark) as they're restyled.
3. **Plan E — Finance module (resumed from the original spec):** the 7-page finance module.
4. **Plan F — Performance audit and fixes:** runs after the visual work lands, since it measures the real built output.
5. **Plan G — Accessibility audit and fixes:** runs last, validating everything built across Plans A–F.

Each plan follows the same execution model already used for A and B: isolated worktree, subagent-driven implementation with task-level review, a final whole-branch review, then merge to `master`.
