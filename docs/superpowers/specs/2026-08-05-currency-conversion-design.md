# Currency Conversion (PHP / USD / EUR)

Date: 2026-08-05

## Context

This is sub-project 1 of 4 from a larger request (Currency conversion,
Consultants directory, Company Documents & Forms, Projects required-forms).
Each gets its own spec/plan/implementation cycle. Build order confirmed:
Currency → Consultants → Documents & Forms → Projects required-forms.

No Currency module exists in this codebase today. All monetary fields
(`Invoice.totalAmount`, `Expense.amount`, `Budget.amount`, `Payment.amount`,
etc.) are plain `Decimal` columns with no currency field at all. Display
formatting is duplicated across 10 files
(`finance/page.tsx`, `invoices-table.tsx`, `expenses-table.tsx`,
`budgets-table.tsx`, `payments-table.tsx`, `invoices/[id]/page.tsx`,
`invoices/[id]/payments-list.tsx`, `statements/page.tsx`,
`invoice-form-dialog.tsx`, `finance-charts.tsx`), plus `reports/page.tsx`
(structurally different — see section 5), each with its own local
`formatCurrency()`/`currency()` hardcoded to `en-US`/`USD` — mislabeled,
since this is a Philippine company and the values are really PHP.

Confirmed with user:
- Currency selector affects real Finance dashboard displays (not a separate
  converter tool).
- All stored values are treated as PHP, no exceptions. This is a display-only
  feature — storage/calculations are untouched.
- Integrate a real free live-rate API now, not just a manual table.
- One selector in the Finance section header, persisted per-browser
  (`localStorage`), not per-user in the database.

## 1. Rate provider

`src/lib/exchange-rates.ts`:

```ts
export type Rates = { USD: number; EUR: number }; // PHP → X multipliers

const FALLBACK_RATES: Rates = { USD: 0.0175, EUR: 0.016 }; // approximate, updated periodically

export async function getExchangeRates(): Promise<Rates> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=PHP&to=USD,EUR", {
      next: { revalidate: 21600 }, // 6 hours
    });
    if (!res.ok) return FALLBACK_RATES;
    const data = await res.json();
    if (typeof data?.rates?.USD !== "number" || typeof data?.rates?.EUR !== "number") {
      return FALLBACK_RATES;
    }
    return { USD: data.rates.USD, EUR: data.rates.EUR };
  } catch {
    return FALLBACK_RATES;
  }
}
```

Frankfurter.app: free, no API key/signup, ECB-backed. Next's built-in `fetch`
cache handles revalidation — no custom cache. Fallback is a static constant,
never throws, so a Finance page never breaks on API downtime. Swapping to a
different provider later means rewriting this one function's body; the
`Rates` type and call sites don't change.

## 2. Formatting

`src/lib/currency.ts`:

```ts
export type CurrencyCode = "PHP" | "USD" | "EUR";

const LOCALE_BY_CURRENCY: Record<CurrencyCode, string> = {
  PHP: "en-PH",
  USD: "en-US",
  EUR: "en-IE", // English-speaking eurozone locale: "€1,234.56"
};

export function formatCurrency(amountPhp: number, currency: CurrencyCode, rates: Rates): string {
  const converted = currency === "PHP" ? amountPhp : amountPhp * rates[currency];
  return converted.toLocaleString(LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
  });
}
```

## 3. State: CurrencyProvider + useCurrency

`src/components/shared/currency-provider.tsx` (client component, mirrors the
existing `theme-provider.tsx` pattern — a thin context wrapper, not a new
architectural pattern):

- Holds `{ currency: CurrencyCode, setCurrency, rates: Rates }`.
- `currency` persisted to `localStorage` (key: `dmd-currency`), default
  `"PHP"`.
- `rates` comes in as a prop from the server (fetched once per page load by
  the layout below) — no client-side fetch, no loading state to handle.

`src/lib/use-currency.ts`: `useCurrency()` hook reading the context, exposing
`{ currency, setCurrency, format(amountPhp): string }` — `format` closes over
`rates`/`currency` so call sites never touch `Rates` directly.

## 4. Finance layout + selector

`src/app/dashboard/finance/layout.tsx` (new — no shared layout exists for
`/dashboard/finance/*` today, each page is standalone):

```tsx
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const rates = await getExchangeRates();
  return (
    <CurrencyProvider initialRates={rates}>
      <div className="mb-4 flex justify-end">
        <CurrencySelector />
      </div>
      {children}
    </CurrencyProvider>
  );
}
```

`src/components/shared/currency-selector.tsx`: shadcn `Select` (same
component already used throughout the app, e.g. category pickers), three
options PHP/USD/EUR, calls `setCurrency` on change.

This adds one small toolbar row above every Finance page. No existing page's
`<h1>`/header markup is touched — the layout wraps `children`, it doesn't
replace anything.

## 5. Replacing the duplicated `formatCurrency` call sites

New `src/components/shared/currency-amount.tsx` (client component):

```tsx
"use client";
export function CurrencyAmount({ amountPhp }: { amountPhp: number }) {
  const { format } = useCurrency();
  return <>{format(amountPhp)}</>;
}
```

**9 files with a drop-in local `formatCurrency`/local-number call site**
(`finance/page.tsx`, `invoices-table.tsx`, `expenses-table.tsx`,
`budgets-table.tsx`, `payments-table.tsx`, `invoices/[id]/page.tsx`,
`invoices/[id]/payments-list.tsx`, `statements/page.tsx`, and
`invoice-form-dialog.tsx` — confirmed with the user that the invoice
create/edit dialog's live subtotal/tax/total preview should also convert,
for consistency with the rest of the Finance section) — their local
`formatCurrency(value)` call sites become `<CurrencyAmount amountPhp={value} />`,
and the local function definitions are deleted. Parent Server Components
(`finance/page.tsx`, `invoices-table.tsx`, etc.) are untouched otherwise —
only the leaf value display becomes a client component.
`invoice-form-dialog.tsx` is already a Client Component, so this is a
straightforward swap there too.

`finance-charts.tsx` is already a Client Component (Recharts requires it) —
it calls `useCurrency().format()` directly for axis ticks and tooltip values
instead of rendering `<CurrencyAmount>` (a hook call fits Recharts'
formatter-callback props better than a JSX leaf).

**`reports/page.tsx` + `report-table.tsx`** (confirmed in scope, not deferred):
structurally different — a Server Component builds `rows: (string | number)[][]`
with currency values already formatted into plain strings server-side
(`currency(d.amount)` called inline while constructing each report's rows),
then passes `rows` to `<ReportTable>` (already a Client Component) which
renders them generically AND uses the same array for CSV export
(`rows.map((row) => row.map(String))`). A currency value can't be
client-converted once it's already a formatted string, and the array mixes
plain strings/numbers with currency values in the same shape, so the fix is
a tagged-cell type shared between both files:

```ts
// src/components/shared/report-table.tsx
export type ReportCell = string | number | { phpAmount: number };
```

`reports/page.tsx` replaces every `currency(value)` call with `{ phpAmount: value }`
(the local `currency()` helper is deleted; `rows` becomes `ReportCell[][]`).
`ReportTable` (already `"use client"`) calls `useCurrency()` and, per cell,
renders `<CurrencyAmount amountPhp={cell.phpAmount} />` when the cell is a
tagged object, or the raw value otherwise; `exportCsv` formats the same way
when building the CSV string, so the exported file always matches what's on
screen (WYSIWYG) rather than silently staying in PHP while the page shows a
different currency.

## 6. Error handling

- Rate fetch failure: silent fallback to `FALLBACK_RATES`, already covered
  above. No user-facing error state — PHP display is always correct
  regardless of rates (identity conversion), and USD/EUR just uses slightly
  stale/approximate numbers if the live API is down. This is acceptable for
  a display-only feature with no financial/legal consequence.
- Invalid `localStorage` value (e.g. manually edited to garbage): validated
  against `CurrencyCode` on read in `CurrencyProvider`; falls back to `"PHP"`
  if not one of the three valid codes.

## 7. Out of scope

- No schema changes. No new DB tables/columns.
- No per-user database-persisted preference (localStorage only, per current
  decision).
- No historical/point-in-time rate tracking — always "current" rate, applied
  uniformly to old and new records alike (this is a display convenience, not
  an accounting feature).
- No changes to invoice creation/editing *logic* (line item math, validation,
  server actions) or any server-side calculation —
  `finance-calculations.ts` continues returning raw PHP numbers exactly as it
  does today, and `invoice-form-dialog.tsx`'s inputs still collect raw PHP
  amounts. Only the dialog's computed subtotal/tax/total *display* converts
  (see section 5) — the underlying values sent to `createInvoice`/`updateInvoice`
  are unchanged PHP numbers.
- No PDF generation exists in this project today; not introduced by this
  module.

## Testing

No automated test suite exists in this project (established convention) —
verification is `pnpm typecheck`, `pnpm lint`, `pnpm build`, and manual
browser checks:
- Finance pages load with a PHP/USD/EUR selector, default PHP.
- Switching currency updates every visible amount (KPI cards, tables,
  charts) consistently and instantly (no page reload, no network call).
- Selection persists across a page reload (localStorage).
- Simulate API failure (e.g. temporarily point the fetch URL at a bad host)
  → page still renders, USD/EUR use fallback rates, no crash.
- All 10 files' old local `formatCurrency`/`currency` definitions are gone;
  no duplicate formatting logic remains anywhere in `dashboard/finance/`.
- `reports/page.tsx`: switching currency updates every report's currency
  columns (KPI-style single-value reports and multi-column ones like Project
  Profitability); non-currency columns (names, counts, dates, status) are
  untouched. Exported CSV's currency columns match whatever is currently
  selected on screen, not always PHP.
- `invoice-form-dialog.tsx`: switching currency updates the Subtotal/Tax/
  Discount/Total preview; the actual line-item input fields (quantity, unit
  price) stay as plain PHP number inputs, unconverted — confirming the
  submitted invoice data is unaffected by the display currency.
