# Maritime Redesign — Plan D: Marketing + Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every marketing page and the login page off the legacy `text-navy`/`bg-navy`/`text-gold`/`bg-gold` raw brand tokens onto the semantic token system Plan A/B/C already built, adopt `LogoMark` on the login page (the one place Plan C deliberately skipped), and remove the now-dead legacy gold tokens from `globals.css`. This is Plan D of the maritime redesign; Plans A–C (foundation, dashboard-core, visual/motion foundation) are already merged to `master`.

**Architecture:** This is a pure token-migration pass — no new components, no layout changes. A grounded survey found 55 legacy-token occurrences across 17 files, all following 8 repeating patterns (eyebrow labels, headings, inverted dark blocks, CTA buttons, icon accents, hover links). Each pattern maps to one semantic replacement, applied literally at every occurrence. Once every occurrence is migrated, `--brand-gold`/`--brand-gold-light` and their `--color-gold`/`--color-gold-light` Tailwind mappings become genuinely dead code and get deleted — Plan A's `globals.css` explicitly left them in place with a comment saying "remove then, not before," and this is "then."

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui. No new dependencies.

## Global Constraints

- No changes to server actions, Prisma schema, `auth.ts`, `middleware.ts`, or validation schemas.
- No new dependencies, no new components — this plan only edits `className` strings and two icon imports (Anchor → LogoMark on the login page).
- Verification is `pnpm typecheck` + `pnpm lint` (both zero errors) + a browser check per task, consistent with Plans A–C.
- Commit after every task.
- **The 8 replacement rules, applied consistently everywhere in this plan:**
  1. Eyebrow label `text-xs font-semibold tracking-wide text-gold uppercase` → `text-xs font-semibold tracking-wide text-accent uppercase`
  2. Heading/text `text-navy` → `text-foreground`
  3. `hover:text-navy` → `hover:text-foreground`
  4. Inverted dark block `bg-navy text-white` → `bg-sidebar text-sidebar-foreground` (the `--sidebar` token is exactly "brand navy surface," already theme-adapted: navy in light mode, near-black in dark mode — the correct semantic reuse for a bold full-bleed brand block)
  5. Standalone icon accent `text-gold` (not part of an eyebrow label) → `text-primary`
  6. Button className override `bg-gold text-navy hover:bg-gold/90` → **removed entirely**, no `className` — the default `Button` variant already renders `bg-primary text-primary-foreground hover:bg-primary/80`
  7. Button className override `bg-navy text-white hover:bg-navy/90` → **removed entirely**, same reasoning as rule 6
  8. Outline button className override `border-navy/20 text-navy hover:bg-navy/5` → **removed entirely**, use `variant="outline"` with no `className` — the outline variant already renders correctly with semantic tokens

---

## File Structure

| File | Legacy occurrences |
|---|---|
| `src/components/marketing/section.tsx` | 1 (`SectionHeading` eyebrow + title) |
| `src/components/shared/hero.tsx` | 4 |
| `src/components/marketing/company-introduction.tsx` | 3 |
| `src/components/marketing/services-overview.tsx` | 1 |
| `src/components/marketing/why-choose-us.tsx` | 2 |
| `src/components/marketing/industries-served.tsx` | 1 |
| `src/components/marketing/testimonials-preview.tsx` | 1 |
| `src/components/marketing/contact-cta.tsx` | 2 |
| `src/app/(marketing)/about/page.tsx` | 10 |
| `src/app/(marketing)/services/page.tsx` | 3 |
| `src/app/(marketing)/services/[slug]/page.tsx` | 7 |
| `src/app/(marketing)/projects/page.tsx` | 2 |
| `src/app/(marketing)/projects/[id]/page.tsx` | 1 |
| `src/app/(marketing)/blog/page.tsx` | 2 |
| `src/app/(marketing)/blog/[slug]/page.tsx` | 1 |
| `src/app/(marketing)/contact/page.tsx` | 8 |
| `src/app/(marketing)/contact/contact-form.tsx` | 1 |
| `src/app/(marketing)/book-consultation/page.tsx` | 2 |
| `src/app/(marketing)/book-consultation/booking-form.tsx` | 1 |
| `src/app/login/page.tsx` | 4 (incl. 2 `Anchor` → `LogoMark`) |
| `src/app/login/login-form.tsx` | 1 |
| `src/app/globals.css` | remove `--brand-gold`/`--brand-gold-light`/`--color-gold`/`--color-gold-light` |

`src/components/marketing/projects-preview.tsx` has zero legacy-token hits — not touched by this plan.

---

### Task 1: Shared `SectionHeading` component

**Files:**
- Modify: `src/components/marketing/section.tsx`

This is first because most marketing pages render `SectionHeading`, so fixing it here means fewer pages need their own heading fixes later (the ternary's `invert` branch already handles `text-white`/non-invert correctly for the *description* — only the eyebrow and the non-invert title branch use raw legacy tokens).

- [ ] **Step 1: Fix the eyebrow label (line ~34)**

Find the literal string `text-xs font-semibold tracking-wide text-gold uppercase` in `SectionHeading` and change it to:
```
text-xs font-semibold tracking-wide text-accent uppercase
```

- [ ] **Step 2: Fix the title's non-invert branch (line ~41)**

Find the ternary producing the title's className — the non-invert branch currently resolves to `"text-navy"` (paired with an invert branch resolving to `"text-white"`, which is correct and stays). Change the non-invert branch's `"text-navy"` to `"text-foreground"`. The `invert ? "text-white" : ...` structure itself is correct and unchanged — only the literal string `"text-navy"` in the non-invert arm changes to `"text-foreground"`.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

Start `pnpm dev`, view any marketing page using `SectionHeading` with an eyebrow (e.g. the homepage's "WHO WE ARE" section) in light and dark mode — confirm the eyebrow renders in Seafoam (teal) instead of gold, and headings using the non-invert branch render in the correct theme-aware foreground color (dark text in light mode, light text in dark mode) rather than a fixed navy that would be near-invisible in dark mode.

- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/section.tsx
git commit -m "Migrate SectionHeading off legacy navy/gold tokens"
```

---

### Task 2: Hero

**Files:**
- Modify: `src/components/shared/hero.tsx`

- [ ] **Step 1: Apply the 4 fixes**

- Line ~14: `rounded-full bg-secondary px-3 py-1 text-xs font-medium tracking-wide text-navy uppercase` → change `text-navy` to `text-foreground`.
- Line ~23: `max-w-3xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl` → change `text-navy` to `text-foreground`.
- Line ~47: `className="bg-gold text-navy hover:bg-gold/90"` — remove this `className` prop entirely from the `Button` (rule 6). The button keeps whatever other props it has (e.g. `render={<Link .../>}`), just drops the color override.
- Line ~54: `className="border-navy/20 text-navy hover:bg-navy/5"` — remove this `className` prop entirely (rule 8), keep `variant="outline"`.

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

View the marketing homepage in light and dark mode. Confirm the hero's eyebrow badge and heading are fully legible in both themes (this closes out the exact bug the Plan C final review caught — hero text was previously washed out/invisible in dark mode because `text-navy` doesn't adapt). Confirm both hero CTA buttons render with default token-based styling (solid Ocean Blue "Book Consultation"-style button, outline "Request Quote"-style button) rather than gold/navy.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/hero.tsx
git commit -m "Migrate Hero off legacy navy/gold tokens"
```

---

### Task 3: Homepage components (6 files)

**Files:**
- Modify: `src/components/marketing/company-introduction.tsx`
- Modify: `src/components/marketing/services-overview.tsx`
- Modify: `src/components/marketing/why-choose-us.tsx`
- Modify: `src/components/marketing/industries-served.tsx`
- Modify: `src/components/marketing/testimonials-preview.tsx`
- Modify: `src/components/marketing/contact-cta.tsx`

- [ ] **Step 1: `company-introduction.tsx` (3 fixes)**

- Line ~7: `text-xs font-semibold tracking-wide text-gold uppercase` → `text-xs font-semibold tracking-wide text-accent uppercase` (rule 1).
- Line ~10: `mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl` → change `text-navy` to `text-foreground`.
- Line ~34: `font-heading text-sm font-semibold text-navy` → change `text-navy` to `text-foreground`.

- [ ] **Step 2: `services-overview.tsx` (1 fix)**

- Line ~43: `inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:underline` → change `text-navy` to `text-foreground`.

- [ ] **Step 3: `why-choose-us.tsx` (2 fixes)**

- Line ~45: `flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy text-white` → change `bg-navy text-white` to `bg-sidebar text-sidebar-foreground` (rule 4 — this is an icon-badge block, same "bold navy surface" semantic as the larger inverted sections).
- Line ~49: `font-heading text-sm font-semibold text-navy` → change `text-navy` to `text-foreground`.

- [ ] **Step 4: `industries-served.tsx` (1 fix)**

- Line ~16: `className="bg-navy text-white"` on the `<Section>` element → change to `className="bg-sidebar text-sidebar-foreground"` (rule 4).

- [ ] **Step 5: `testimonials-preview.tsx` (1 fix)**

- Line ~23: `mt-4 text-sm font-semibold text-navy` → change `text-navy` to `text-foreground`.

- [ ] **Step 6: `contact-cta.tsx` (2 fixes)**

- Line ~7: `containerClassName="flex flex-col items-center gap-6 rounded-2xl bg-navy px-6 py-12 text-center text-white sm:px-12"` → change `bg-navy` to `bg-sidebar` and `text-white` to `text-sidebar-foreground` (rule 4).
- Line ~19: `className="bg-gold text-navy hover:bg-gold/90"` — remove this `className` prop entirely (rule 6).

- [ ] **Step 7: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

View the marketing homepage in light and dark mode, scrolling through every section (Who We Are, Our Services, Why Choose Us, Who We Serve, testimonials, final CTA). Confirm no section has washed-out or invisible text in either theme, and the "bold navy block" sections (Why Choose Us icon badges, Industries Served, the final CTA box) render as a solid navy-toned surface in light mode and an appropriately dark surface in dark mode — not identical-looking in both, but both legible with light text on a dark surface.

- [ ] **Step 8: Commit**

```bash
git add src/components/marketing/company-introduction.tsx src/components/marketing/services-overview.tsx src/components/marketing/why-choose-us.tsx src/components/marketing/industries-served.tsx src/components/marketing/testimonials-preview.tsx src/components/marketing/contact-cta.tsx
git commit -m "Migrate homepage marketing components off legacy navy/gold tokens"
```

---

### Task 4: About page

**Files:**
- Modify: `src/app/(marketing)/about/page.tsx`

- [ ] **Step 1: Apply the 10 fixes**

- Line ~39: eyebrow `text-xs font-semibold tracking-wide text-gold uppercase` → `text-accent` (rule 1).
- Line ~42: `mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl` → `text-navy` to `text-foreground`.
- Line ~57: `size-8 text-gold` (standalone icon) → `size-8 text-primary` (rule 5).
- Line ~58: `font-heading text-xl font-semibold text-navy` → `text-navy` to `text-foreground`.
- Line ~69: `size-8 text-gold` → `size-8 text-primary` (rule 5).
- Line ~70: `font-heading text-xl font-semibold text-navy` → `text-navy` to `text-foreground`.
- Line ~85: `mx-auto flex size-12 items-center justify-center rounded-full bg-navy text-white` → `bg-navy text-white` to `bg-sidebar text-sidebar-foreground` (rule 4).
- Line ~88: `mt-4 font-heading text-sm font-semibold text-navy` → `text-navy` to `text-foreground`.
- Line ~97: `className="bg-navy text-white"` (on a `<Section>`) → `className="bg-sidebar text-sidebar-foreground"` (rule 4).
- Line ~98: eyebrow `text-xs font-semibold tracking-wide text-gold uppercase` → `text-accent` (rule 1). Note this eyebrow sits inside the inverted `bg-sidebar` section from the previous fix — confirm visually in Step 2 that Seafoam-on-navy still has good contrast (it should — Seafoam is a light/bright accent).

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

View `/about` in light and dark mode. Confirm every heading, icon, and eyebrow is legible, and the inverted "our values" section (bold navy block) reads correctly in both themes including its eyebrow label inside it.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(marketing)/about/page.tsx"
git commit -m "Migrate About page off legacy navy/gold tokens"
```

---

### Task 5: Services pages

**Files:**
- Modify: `src/app/(marketing)/services/page.tsx`
- Modify: `src/app/(marketing)/services/[slug]/page.tsx`

- [ ] **Step 1: `services/page.tsx` (3 fixes)**

- Line ~24: eyebrow → `text-accent` (rule 1).
- Line ~27: `mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl` → `text-navy` to `text-foreground`.
- Line ~42: `text-2xl font-semibold tracking-tight text-navy` → `text-navy` to `text-foreground`.

- [ ] **Step 2: `services/[slug]/page.tsx` (7 fixes)**

- Line ~62: eyebrow → `text-accent` (rule 1).
- Line ~66: `mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl` → `text-navy` to `text-foreground`.
- Lines ~74, ~82, ~90, ~96 (all four identical): `font-heading text-lg font-semibold text-navy` → `text-navy` to `text-foreground`.
- Line ~112: `font-heading text-lg font-semibold text-navy` → `text-navy` to `text-foreground`.
- Line ~130: `className="bg-gold text-navy hover:bg-gold/90"` — remove this `className` prop entirely (rule 6).

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

View `/services` and one individual service detail page (e.g. `/services/marine-consultancy`) in light and dark mode. Confirm all headings and the CTA button render correctly.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(marketing)/services/page.tsx" "src/app/(marketing)/services/[slug]/page.tsx"
git commit -m "Migrate Services pages off legacy navy/gold tokens"
```

---

### Task 6: Projects pages

**Files:**
- Modify: `src/app/(marketing)/projects/page.tsx`
- Modify: `src/app/(marketing)/projects/[id]/page.tsx`

- [ ] **Step 1: `projects/page.tsx` (2 fixes)**

- Line ~21: eyebrow → `text-accent` (rule 1).
- Line ~24: `mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl` → `text-navy` to `text-foreground`.

- [ ] **Step 2: `projects/[id]/page.tsx` (1 fix)**

- Line ~41: `text-3xl font-semibold tracking-tight text-navy sm:text-4xl` → `text-navy` to `text-foreground`.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

View `/projects` and one project detail page in light and dark mode. Confirm headings render correctly.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(marketing)/projects/page.tsx" "src/app/(marketing)/projects/[id]/page.tsx"
git commit -m "Migrate Projects pages off legacy navy/gold tokens"
```

---

### Task 7: Blog pages

**Files:**
- Modify: `src/app/(marketing)/blog/page.tsx`
- Modify: `src/app/(marketing)/blog/[slug]/page.tsx`

- [ ] **Step 1: `blog/page.tsx` (2 fixes)**

- Line ~21: eyebrow → `text-accent` (rule 1).
- Line ~22: `mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl` → `text-navy` to `text-foreground`.

- [ ] **Step 2: `blog/[slug]/page.tsx` (1 fix)**

- Line ~43: `text-3xl font-semibold tracking-tight text-navy sm:text-4xl` → `text-navy` to `text-foreground`.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

View `/blog` and one blog post in light and dark mode. Confirm headings render correctly.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(marketing)/blog/page.tsx" "src/app/(marketing)/blog/[slug]/page.tsx"
git commit -m "Migrate Blog pages off legacy navy/gold tokens"
```

---

### Task 8: Contact page

**Files:**
- Modify: `src/app/(marketing)/contact/page.tsx`
- Modify: `src/app/(marketing)/contact/contact-form.tsx`

- [ ] **Step 1: `contact/page.tsx` (8 fixes)**

- Line ~20: eyebrow → `text-accent` (rule 1).
- Line ~23: `mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl` → `text-navy` to `text-foreground`.
- Line ~35: `size-4 shrink-0 text-gold` → `size-4 shrink-0 text-primary` (rule 5).
- Line ~36: `className="hover:text-navy"` → `className="hover:text-foreground"` (rule 3).
- Line ~43: `size-4 shrink-0 text-gold` → `size-4 shrink-0 text-primary` (rule 5).
- Line ~44: `className="hover:text-navy"` → `className="hover:text-foreground"` (rule 3).
- Line ~51: `size-4 shrink-0 text-gold` → `size-4 shrink-0 text-primary` (rule 5).
- Lines ~65, ~75, ~85 (all three identical): `text-muted-foreground underline underline-offset-4 hover:text-navy` → change `hover:text-navy` to `hover:text-foreground` (rule 3).

- [ ] **Step 2: `contact-form.tsx` (1 fix)**

- Line ~58: `className="mt-2 self-start bg-navy text-white hover:bg-navy/90"` — remove this `className` prop entirely (rule 7), keep `self-start` if it's needed for layout — check: if `self-start` is doing real layout work (not just part of the color override), keep `className="self-start"` on the button and only drop the color-related classes (`bg-navy text-white hover:bg-navy/90`).

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

View `/contact` in light and dark mode. Confirm the eyebrow, heading, contact-detail icons (mail/phone/map-pin), hover states on contact links and social links, and the form's submit button all render correctly with theme-aware colors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(marketing)/contact/page.tsx" "src/app/(marketing)/contact/contact-form.tsx"
git commit -m "Migrate Contact page off legacy navy/gold tokens"
```

---

### Task 9: Book Consultation page

**Files:**
- Modify: `src/app/(marketing)/book-consultation/page.tsx`
- Modify: `src/app/(marketing)/book-consultation/booking-form.tsx`

- [ ] **Step 1: `book-consultation/page.tsx` (2 fixes)**

- Line ~31: eyebrow → `text-accent` (rule 1).
- Line ~34: `mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl` → `text-navy` to `text-foreground`.

- [ ] **Step 2: `booking-form.tsx` (1 fix)**

- Line ~121: `className="mt-2 self-start bg-gold text-navy hover:bg-gold/90"` — remove the color classes (rule 6); keep `className="self-start"` if `self-start` is doing real layout work, same reasoning as Task 8 Step 2.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

View `/book-consultation` in light and dark mode. Confirm the eyebrow, heading, and form submit button render correctly.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(marketing)/book-consultation/page.tsx" "src/app/(marketing)/book-consultation/booking-form.tsx"
git commit -m "Migrate Book Consultation page off legacy navy/gold tokens"
```

---

### Task 10: Login page

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/login/login-form.tsx`

**Interfaces:**
- Consumes: `LogoMark` from `@/components/shared/logo-mark` (Plan C, already merged).

- [ ] **Step 1: `login/page.tsx` — swap Anchor for LogoMark and fix tokens (4 fixes)**

- Find the `Anchor` import from `lucide-react` at the top of the file. If `Anchor` is the only icon imported from `lucide-react` in this file, replace the import line with `import { LogoMark } from "@/components/shared/logo-mark";`. If other icons are also imported from `lucide-react` in this file, remove just `Anchor` from that import and add the `LogoMark` import as a separate line.
- Line ~12: `hidden flex-col justify-between bg-navy p-10 text-white lg:flex` → change `bg-navy` to `bg-sidebar` and `text-white` to `text-sidebar-foreground` (rule 4 — this is the split-screen login panel, the same "bold navy block" pattern as elsewhere).
- Line ~14: `<Anchor className="size-7 text-gold" ... />` → `<LogoMark className="size-7 text-sidebar-primary" ... />` (use `text-sidebar-primary`, not `text-primary` — this icon sits on the `bg-sidebar` panel from the previous fix, and `--sidebar-primary` is the token specifically designed for accents on top of the sidebar/navy surface, same as how the dashboard sidebar's own logo uses `text-sidebar-primary`).
- Line ~31: `className="flex items-center gap-2 text-navy"` → change `text-navy` to `text-foreground` (this is the mobile/compact logo lockup, on the regular page background, not the navy panel).
- Line ~32: `<Anchor className="size-6 text-gold" ... />` → `<LogoMark className="size-6 text-primary" ... />` (this one sits on the regular background, so `text-primary` is correct here, matching how navbar/footer's `LogoMark` already uses `text-primary`).

- [ ] **Step 2: `login-form.tsx` (1 fix)**

- Line ~32: `className="mt-2 bg-navy text-white hover:bg-navy/90"` — remove this `className` prop entirely (rule 7).

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS.

View `/login` in light and dark mode at desktop width (to see the split-screen panel) and at mobile width (to see the compact logo lockup instead). Confirm both `LogoMark` instances render correctly (Seafoam-ish accent on the navy panel, Ocean Blue on the regular background), the panel itself is legible in both themes, and the sign-in button uses the default token-based button styling.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx src/app/login/login-form.tsx
git commit -m "Migrate login page off legacy navy/gold tokens, adopt LogoMark"
```

---

### Task 11: Remove legacy gold tokens

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: confirmation from Tasks 1–10 that no `text-gold`/`bg-gold`/`text-gold-light`/`bg-gold-light` usage remains anywhere in `src/`.

- [ ] **Step 1: Confirm no remaining usage**

Run (from the repo root):
```bash
grep -rn "text-gold\|bg-gold" src --include="*.tsx"
```
Expected: no output (zero matches). If this finds any remaining usage, STOP — do not proceed with this task. Report back which file/line still references it; that means an earlier task missed an occurrence and needs to be fixed first (go fix it in that file directly, following the same rule 1/5/6/7 mapping as the relevant earlier task, then re-run this grep before continuing).

- [ ] **Step 2: Remove the legacy tokens from `globals.css`**

Remove this block (added by Plan A with the comment explaining it was temporary):
```css
  /* Legacy tokens — still referenced by hero.tsx and login-form.tsx until the
     Marketing+Auth plan migrates them. Remove then, not before. */
  --brand-gold: #c9a036;
  --brand-gold-light: #e4c878;
```
from the `:root` block containing the `--brand-*` raw tokens.

Also remove these two lines from the `@theme inline` block:
```css
  --color-gold: var(--brand-gold);
  --color-gold-light: var(--brand-gold-light);
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS — if any file still referenced `bg-gold`/`text-gold`, Tailwind would simply fail to generate that utility (not a hard build error, but the class would render unstyled), so also re-run the Step 1 grep once more after this change to be certain, and visually spot-check 2-3 marketing pages to confirm nothing looks unstyled.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "Remove legacy gold tokens now that all consumers are migrated"
```

---

### Task 12: Plan D final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both PASS with zero errors.

- [ ] **Step 2: Confirm zero legacy-token references remain**

Run:
```bash
grep -rn "text-navy\|bg-navy\|border-navy\|text-gold\|bg-gold" src --include="*.tsx"
```
Expected: no output. (`text-navy`/`bg-navy` as raw Tailwind utilities backed by `--brand-navy` are allowed to remain ONLY if intentionally used elsewhere for a deliberate one-off brand moment — per this codebase's convention comment in `globals.css`. Given this plan's scope was to migrate every marketing/login occurrence, expect true zero matches; if any remain, they were missed and should be fixed using the same rule mapping before considering this plan done.)

- [ ] **Step 3: Full browser QA — light mode**

Visit every marketing page (`/`, `/about`, `/services`, `/services/[a-real-slug]`, `/projects`, `/projects/[a-real-id]`, `/blog`, `/blog/[a-real-slug]`, `/contact`, `/book-consultation`) and `/login`. Confirm every heading, eyebrow, icon, button, and inverted section renders with correct maritime-palette colors, nothing looks unstyled or uses a color that doesn't fit the palette.

- [ ] **Step 4: Full browser QA — dark mode**

Toggle dark mode and repeat the same walkthrough. Pay particular attention to every "inverted navy block" section (Why Choose Us icon badges, Industries Served, About's values section, homepage's final CTA, login's split panel) — these use `bg-sidebar`, which is already dark in light mode and near-black in dark mode, so confirm they still read as a distinct surface (not identical to the page background) in dark mode too.

- [ ] **Step 5: Responsive check**

Resize to mobile width (375px) for the homepage, `/contact`, and `/login`. Confirm layouts still work and text remains legible at every breakpoint.

- [ ] **Step 6: Final commit (if any QA fixes were made)**

```bash
git add -A
git commit -m "Fix visual issues found in Plan D cross-browser QA pass"
```

(Skip this step if Steps 3–5 found no issues needing fixes.)
