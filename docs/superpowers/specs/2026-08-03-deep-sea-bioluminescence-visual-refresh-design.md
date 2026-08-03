# Deep Sea Bioluminescence — Visual Refresh

Date: 2026-08-03
Status: Approved by user, ready for implementation planning
Relationship to prior specs: this is a **palette and treatment refresh** on top of the maritime redesign delivered by Plans A–D (`2026-08-02-maritime-redesign-design.md` and its visual/motion addendum). It does not redo that work — it re-tunes the token *values* and extends the "bold inverted block" pattern Plan D already established (`--sidebar`/`--sidebar-foreground`, always-dark regardless of theme) to cover the marketing hero/CTA moments. The semantic token architecture, `AnimatedSky`, `WaveDivider`, `.glass-panel`, and `LogoMark` components built in Plans A–C are reused as-is; only their color values and a small number of consumers change.

## Goal

Replace the current navy/ocean/teal palette with a "Deep Sea Bioluminescence" direction — near-black teal-navy base, glowing cyan/violet accents — applied as two coordinated registers:

- **Marketing site:** the hero and CTA moments always render the full dark bioluminescent look, regardless of the visitor's light/dark preference — it's the brand's signature first impression, not a theme-reactive surface.
- **Dashboard:** stays a calm, near-white "toned-down companion" by default (same teal/violet hue family, deepened/desaturated for daylight legibility over hours of data work), with the full glow treatment available via the dashboard's own dark-mode toggle.

## Non-goals / Guardrails

- No new CSS custom properties beyond what Plans A–D already defined. This is a re-tuning of existing token *values* (`--background`, `--foreground`, `--primary`, `--accent`, `--sidebar*`, `--chart-*`, etc.) plus routing a handful of marketing components onto the existing `--sidebar`-family tokens (the same mechanism Plan D used for Industries Served, the homepage final CTA, and the login split panel) — not a new architecture.
- No new dependencies. Motion stays CSS-only (`transform`/`opacity`), same `prefers-reduced-motion` handling `AnimatedSky` already has.
- **Hard safety rule, learned from an aborted attempt at a background-color change earlier this project:** `--foreground` must always stay paired with `--background` in the same mode (both light-appropriate or both dark-appropriate together, never crossed), and `--card`/`--card-foreground`, `--muted`/`--muted-foreground`, `--secondary`/`--secondary-foreground` must each remain internally consistent independently. Do not flip `--foreground` globally to fix a contrast problem in one place — trace which specific surface needs light text and give it an explicit override (the `--sidebar`-family pattern), the way this spec already scopes the hero.
- Dashboard tables/cards/forms are not touched beyond the chart/status color remap — Plan D's existing `text-foreground`/`text-muted-foreground` usage inside `Card`/`Table` stays exactly as-is and must not regress.
- Not a repeat of Plan D's file-by-file sweep. This changes values behind tokens already in place, plus a bounded, named set of components.

## 1. Token Values

Reuse every existing variable name in `src/app/globals.css`; only hex values change.

### Light mode `:root` (toned-down companion — calm, near-white, used by dashboard by default and by marketing body content below the fold)

| Token | New value | Was |
|---|---|---|
| `--background` | `#f4f8f8` | `#f7fafc` |
| `--foreground` | `#0d2b30` | `#102a43` |
| `--card` | `#ffffff` | unchanged |
| `--card-foreground` | `#0d2b30` | `#102a43` |
| `--primary` | `#0d9488` (deepened teal) | `#1565c0` |
| `--primary-foreground` | `#ffffff` | unchanged |
| `--accent` | `#6d5ce6` (deepened violet) | `#2ec4b6` |
| `--accent-foreground` | `#ffffff` | `#0b2545` |
| `--secondary` | `#e7f3f2` (pale teal wash) | `#eaf4f8` |
| `--secondary-foreground` | `#0d2b30` | `#0b2545` |
| `--muted` | `#eef3f2` | `#f8f5f0` |
| `--muted-foreground` | `#5c7a7d` | `#5c677d` |
| `--border` / `--input` | `#d9e6e5` | `#dce6ef` |
| `--ring` | `#0d9488` | `#4a90e2` |

### Dark mode `.dark` (full bioluminescent glow — dashboard's dark-mode toggle)

| Token | New value | Was |
|---|---|---|
| `--background` | `#051419` | `#04101a` |
| `--foreground` | `#eafaf8` | `#eaf4f8` |
| `--card` | `#0a2530` | `#003049` |
| `--card-foreground` | `#eafaf8` | `#eaf4f8` |
| `--primary` | `#38f0d8` (cyan glow) | `#4a90e2` |
| `--primary-foreground` | `#051419` | `#04101a` |
| `--accent` | `#7b6ef6` (violet glow) | `#2ec4b6` |
| `--accent-foreground` | `#051419` | `#04101a` |
| `--secondary` | `#0d3540` | `#0b2545` |
| `--muted-foreground` | `#8fb0ae` | `#9fb7c7` |

### `--sidebar`-family (both modes — this is the "always dark, bioluminescent" surface family; reused for the marketing hero, not just dashboard sidebar/inverted-blocks)

| Token | Light-mode value | Dark-mode value |
|---|---|---|
| `--sidebar` | `#051419` | `#020d10` |
| `--sidebar-foreground` | `#eafaf8` | `#eafaf8` |
| `--sidebar-primary` | `#38f0d8` | `#38f0d8` |
| `--sidebar-primary-foreground` | `#051419` | `#051419` |
| `--sidebar-accent` | `#0d3540` | `#0a2530` |
| `--sidebar-accent-foreground` | `#eafaf8` | `#eafaf8` |

### Chart colors (`--chart-1..5`, both dashboard and any marketing data viz)

Remapped off navy/ocean/gold onto the teal/violet/coral family: `#38f0d8` (cyan), `#7b6ef6` (violet), `#ff6b6b` (coral, unchanged brand token), `#0d9488` (deep teal), `#f4b400` (warning-amber, unchanged — kept distinct from the new palette so status/warning meaning stays unambiguous).

### Raw `--brand-*` values

Update `--brand-ocean`/`--brand-harbor`/`--brand-seafoam` toward the new cyan/violet family so any deliberate one-off brand usage (per the existing `globals.css` convention comment) stays visually consistent. Exact values finalized during implementation against the table above (they should match the dark-mode `--primary`/`--accent`/`--sidebar-accent` values, since those raw tokens back the semantic ones).

## 2. Marketing "Always-Dark" Hero/CTA Mechanism

- `AnimatedSky`'s `variant="full"` (used only in the `(marketing)` layout) drops its `dark:hidden`/`dark:block` conditional entirely and always renders the bioluminescent dark-sky layer — glow blooms plus drifting cyan/violet "plankton" dot particles replacing the current stars, same `prefers-reduced-motion` handling as today (static composition, no motion, when reduced-motion is set).
- `AnimatedSky`'s `variant="subtle"` (dashboard) is unchanged in behavior: still theme-reactive (toned light-mode wash / full glow in dashboard dark mode).
- `Hero` (`src/components/shared/hero.tsx`) and the marketing CTA moments that currently use `bg-sidebar text-sidebar-foreground` (Plan D's "inverted block" pattern — Industries Served, homepage final CTA, `contact-cta.tsx`, About's values section, login's split panel) automatically pick up the new bioluminescent `--sidebar`-family values from the table above — no component code changes needed there beyond the token retune, since Plan D already routed them through this exact family.
- `Hero`'s eyebrow badge and heading, which currently use `bg-secondary`/`text-foreground` (reactive tokens), get routed onto the `--sidebar`-family tokens instead (`bg-sidebar-accent text-sidebar-foreground` for the badge, `text-sidebar-foreground` for the heading) so they render correctly as light-on-dark regardless of the visitor's toggle. This is the one genuinely new consumer-routing change in this spec — everywhere else, existing Plan D consumers of `--sidebar` inherit the new look for free.
- The hero's primary CTA button gets an explicit `bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90` override, rather than `Button`'s default `primary` variant. Reason: the default primary variant reads the reactive `--primary`, which resolves to daylight teal in light mode — wrong on the always-dark hero. This mirrors the same surface-aware split `LogoMark` already uses (`text-sidebar-primary` when on the sidebar surface, `text-primary` elsewhere). The outline CTA keeps `variant="outline"` with no `className` override, same as Plan D — its `border-border`/`hover:bg-muted` styling is theme-reactive by design for a secondary action, and reads fine against the dark hero at low opacity; confirm visually during implementation and add a `border-sidebar-foreground/20` override only if it doesn't.

## 3. Dashboard Treatment

- Dashboard stays on the reactive `--background`/`--foreground`/`--card` tokens (Plan D/B's existing pattern) — no "always-dark" routing. Light mode (default) is the toned-down companion; dark mode (user-toggled) is full glow.
- `StatCard`, chart components (`report-charts.tsx`, `finance-charts.tsx`), and any status-color maps (`booking-calendar.tsx`, `schedule-calendar.tsx` — the same two files Plan D's Task 11 touched) get their hardcoded color references remapped from the old navy/ocean/gold family to the new `--chart-*`/teal/violet family, preserving one rule: **each status/type in a given map must remain visually distinct from its siblings** (the same rule Plan D's Task 11 applied when choosing `bg-accent` over `bg-primary` for a collision).
- No change to `Card`/`Table`/form component structure or their existing `text-foreground`/`text-muted-foreground` usage — those are proven correct by Plan D and stay as-is.

## 4. Component Touches

- `AnimatedSky`: recolor both layers per the token table; dark/marketing layer's "star" dots become slow-pulsing cyan/violet glow dots (same deterministic, non-random positioning as today — no new JS).
- `WaveDivider`, `.glass-panel`: recolor to the new accent family; no structural or API change.
- `LogoMark`: no shape change; color is `currentColor`-driven already, so it inherits the new `text-sidebar-primary`/`text-primary` values automatically once the tokens update.

## 5. Rollout / Testing

- `pnpm typecheck && pnpm lint`, zero errors, before and after.
- Full browser QA: light mode and dark mode, marketing and dashboard, desktop and mobile (375px) — reusing the same page list Plan D's Task 12 verified.
- **Explicit contrast spot-check on every place text sits directly on a background** (not inside a `Card`) — this is the exact failure class from the aborted background-color attempt earlier this project. Check computed-style contrast, not just visual glance, on: Hero heading/eyebrow/CTA buttons, every `bg-sidebar`-family inverted block, dashboard page-title `<h1>`s (confirmed during that earlier attempt to sit directly on the dashboard canvas), and both `AnimatedSky` layers' text overlays.
- No commit without both the token diff and the consumer-routing diff (Hero, dashboard chart/status maps) verified together — a token-only change without the Hero routing update would repeat the exact "hero invisible in light mode" failure from earlier today.
