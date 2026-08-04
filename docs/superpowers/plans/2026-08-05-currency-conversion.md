# Currency Conversion (PHP / USD / EUR) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PHP/USD/EUR display-currency selector to the Finance dashboard that live-converts every visible monetary amount (KPI cards, tables, charts, reports, invoices) while keeping all stored/calculated values in PHP.

**Architecture:** All monetary data stays raw PHP `Decimal` in the DB — no schema change. A server-fetched, cached exchange-rate lookup feeds a client-side React Context (`CurrencyProvider`) that every Finance page is wrapped in via a new `finance/layout.tsx`. A small `<CurrencyAmount>` leaf component and a `useCurrency()` hook replace 10 duplicated, hardcoded-USD `formatCurrency()` functions scattered across the Finance section, converting and formatting on the client with zero extra network calls per toggle.

**Tech Stack:** Next.js 16 (App Router, Server/Client Components), React Context, `Intl.NumberFormat`, Frankfurter.app (free, no-key exchange rate API), Recharts (existing).

## Global Constraints

- No schema changes, no new DB tables/columns. Storage/calculations stay PHP; this is a display-only feature.
- Currency preference persists via `localStorage` only (not per-user in the DB).
- Rate fetch failure must never break a page — always fall back to a static rate constant, no user-facing error state.
- No new test framework — this project has none (no jest/vitest/playwright in `package.json`). Verification is `pnpm typecheck`, `pnpm lint`, `pnpm build`, and manual browser checks.
- Every file listed below is confirmed in scope, including `invoice-form-dialog.tsx`'s live preview and `invoices/[id]/page.tsx` (the printable invoice document) — both confirmed with the user to convert along with everything else, not stay PHP-fixed.
- `reports/page.tsx`'s own CSV export (via `<ReportTable>`) must match whatever currency is currently displayed on screen (WYSIWYG), not silently stay in PHP.
- The three tables with their own separate "Export" CSV buttons (`invoices-table.tsx`, `expenses-table.tsx`, `payments-table.tsx`) already export raw `.toFixed(2)` PHP decimals with no currency symbol and no `formatCurrency` call — these CSV export functions are untouched by this plan; only the on-screen `<TableCell>`/summary-line display in those same files converts.

---

### Task 1: Exchange rate provider

**Files:**
- Create: `src/lib/exchange-rates.ts`

**Interfaces:**
- Produces: `export type Rates = { USD: number; EUR: number }` (PHP → X multipliers), `export async function getExchangeRates(): Promise<Rates>`. Every later task that needs live rates imports these two names from this file.

- [ ] **Step 1: Write the module**

```ts
// src/lib/exchange-rates.ts
export type Rates = { USD: number; EUR: number }; // PHP → X multipliers

const FALLBACK_RATES: Rates = { USD: 0.0175, EUR: 0.016 }; // approximate, update periodically

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

- [ ] **Step 2: Verify the live fetch works and the fallback path works**

This project has no test runner, so verify with two throwaway `tsx` runs (delete the scratch file after):

```bash
cat > scratch-rates-check.ts <<'EOF'
import { getExchangeRates } from "./src/lib/exchange-rates";
getExchangeRates().then((rates) => console.log("live:", rates));
EOF
npx tsx --env-file=.env scratch-rates-check.ts
```
Expected: prints `live: { USD: <number around 0.017>, EUR: <number around 0.015> }` — real numbers from the API, not the fallback constants.

Then temporarily edit the fetch URL in `src/lib/exchange-rates.ts` to an unreachable host (e.g. `https://this-host-does-not-exist.invalid/rates`), re-run the same script:

Expected: prints `live: { USD: 0.0175, EUR: 0.016 }` (the exact `FALLBACK_RATES` values) — confirms the `catch` path works, no exception escapes. Revert the URL back to `https://api.frankfurter.app/latest?from=PHP&to=USD,EUR` afterward.

```bash
rm scratch-rates-check.ts
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```
Expected: clean, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/exchange-rates.ts
git commit -m "feat: add exchange rate provider with Frankfurter API and static fallback"
```

---

### Task 2: Currency formatting utility

**Files:**
- Create: `src/lib/currency.ts`

**Interfaces:**
- Consumes: `Rates` type from `src/lib/exchange-rates.ts` (Task 1).
- Produces: `export type CurrencyCode = "PHP" | "USD" | "EUR"`, `export function formatCurrency(amountPhp: number, currency: CurrencyCode, rates: Rates): string`. Every later task that formats a money value uses this function's exact name and signature.

- [ ] **Step 1: Write the module**

```ts
// src/lib/currency.ts
import type { Rates } from "./exchange-rates";

export type CurrencyCode = "PHP" | "USD" | "EUR";

export const CURRENCY_CODES: CurrencyCode[] = ["PHP", "USD", "EUR"];

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

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCY_CODES as string[]).includes(value);
}
```

`isCurrencyCode` is exported now because Task 3's `localStorage` read needs to validate an arbitrary string safely — defining it here (next to `CurrencyCode`) keeps the type and its own validator in one file.

- [ ] **Step 2: Verify**

```bash
cat > scratch-currency-check.ts <<'EOF'
import { formatCurrency, isCurrencyCode } from "./src/lib/currency";
const rates = { USD: 0.0175, EUR: 0.016 };
console.log(formatCurrency(1000, "PHP", rates));
console.log(formatCurrency(1000, "USD", rates));
console.log(formatCurrency(1000, "EUR", rates));
console.log(isCurrencyCode("USD"), isCurrencyCode("GBP"), isCurrencyCode(42));
EOF
npx tsx scratch-currency-check.ts
rm scratch-currency-check.ts
```
Expected output (4 lines):
```
₱1,000.00
$17.50
€16.00
true false false
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/currency.ts
git commit -m "feat: add currency formatting utility with locale-correct output per currency"
```

---

### Task 3: CurrencyProvider + useCurrency hook

**Files:**
- Create: `src/components/shared/currency-provider.tsx`

**Interfaces:**
- Consumes: `Rates` from `src/lib/exchange-rates.ts` (Task 1); `CurrencyCode`, `formatCurrency`, `isCurrencyCode` from `src/lib/currency.ts` (Task 2).
- Produces: `export function CurrencyProvider({ children, initialRates }: { children: React.ReactNode; initialRates: Rates }): JSX.Element`, `export function useCurrency(): { currency: CurrencyCode; setCurrency: (c: CurrencyCode) => void; format: (amountPhp: number) => string }`. Every later task that needs currency state/formatting calls `useCurrency()` from this exact file.

- [ ] **Step 1: Write the module**

```tsx
// src/components/shared/currency-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Rates } from "@/lib/exchange-rates";
import { type CurrencyCode, formatCurrency, isCurrencyCode } from "@/lib/currency";

const STORAGE_KEY = "dmd-currency";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  format: (amountPhp: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({
  children,
  initialRates,
}: {
  children: React.ReactNode;
  initialRates: Rates;
}) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("PHP");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isCurrencyCode(stored)) {
      setCurrencyState(stored);
    }
  }, []);

  function setCurrency(next: CurrencyCode) {
    setCurrencyState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  const value: CurrencyContextValue = {
    currency,
    setCurrency,
    format: (amountPhp: number) => formatCurrency(amountPhp, currency, initialRates),
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
```

Renders `"PHP"` on first render (server and client match, no hydration mismatch), then reads `localStorage` once in a `useEffect` and switches if a valid stored preference exists — the same hydration-safe pattern `next-themes` uses under the hood, applied by hand since there's no such library for this. `initialRates` is a plain prop (fetched server-side once per page load, not re-fetched on every currency toggle).

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```
Expected: clean (Task 4/5 will actually render this component; typecheck alone confirms the module compiles standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/currency-provider.tsx
git commit -m "feat: add CurrencyProvider context and useCurrency hook"
```

---

### Task 4: CurrencySelector + CurrencyAmount components

**Files:**
- Create: `src/components/shared/currency-selector.tsx`
- Create: `src/components/shared/currency-amount.tsx`

**Interfaces:**
- Consumes: `useCurrency` from `src/components/shared/currency-provider.tsx` (Task 3); `CURRENCY_CODES` from `src/lib/currency.ts` (Task 2); existing `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` from `@/components/ui/select`.
- Produces: `export function CurrencySelector(): JSX.Element`, `export function CurrencyAmount({ amountPhp }: { amountPhp: number }): JSX.Element`. Tasks 6-9 render `<CurrencyAmount amountPhp={n} />` in place of every old `formatCurrency(n)` call.

- [ ] **Step 1: Write `currency-selector.tsx`**

```tsx
// src/components/shared/currency-selector.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_CODES, type CurrencyCode } from "@/lib/currency";
import { useCurrency } from "./currency-provider";

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyCode)}>
      <SelectTrigger size="sm" className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCY_CODES.map((code) => (
          <SelectItem key={code} value={code}>
            {code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Write `currency-amount.tsx`**

```tsx
// src/components/shared/currency-amount.tsx
"use client";

import { useCurrency } from "./currency-provider";

export function CurrencyAmount({ amountPhp }: { amountPhp: number }) {
  const { format } = useCurrency();
  return <>{format(amountPhp)}</>;
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/currency-selector.tsx src/components/shared/currency-amount.tsx
git commit -m "feat: add CurrencySelector and CurrencyAmount components"
```

---

### Task 5: Finance layout wiring

**Files:**
- Create: `src/app/dashboard/finance/layout.tsx`

**Interfaces:**
- Consumes: `getExchangeRates` from `src/lib/exchange-rates.ts` (Task 1); `CurrencyProvider` from `src/components/shared/currency-provider.tsx` (Task 3); `CurrencySelector` from `src/components/shared/currency-selector.tsx` (Task 4).
- Produces: nothing consumed by name by later tasks — this is the mount point that makes `useCurrency()` available to every page under `/dashboard/finance/*`.

- [ ] **Step 1: Write the layout**

```tsx
// src/app/dashboard/finance/layout.tsx
import { getExchangeRates } from "@/lib/exchange-rates";
import { CurrencyProvider } from "@/components/shared/currency-provider";
import { CurrencySelector } from "@/components/shared/currency-selector";

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

No `/dashboard/finance/*` page currently has a shared layout — this file doesn't exist today. It nests inside the existing `src/app/dashboard/layout.tsx` (the dashboard chrome/sidebar), matching Next.js's normal nested-layout behavior; no changes needed to `dashboard/layout.tsx` itself.

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```
Expected: clean.

- [ ] **Step 3: Manual check**

```bash
pnpm dev
```
Sign in as the dev admin, visit `/dashboard/finance`. Expected: a small "PHP" dropdown appears at the top-right, above the existing "Finance" heading; switching it doesn't yet change any numbers (Tasks 6-9 wire the actual displays) but doesn't error either. Check the browser console for errors (there should be none — `useCurrency()` is only called by `CurrencySelector` itself right now, which is safely inside the provider).

Also verify the invalid-`localStorage`-value fallback from Task 3: open the browser devtools console and run `localStorage.setItem("dmd-currency", "GBP")`, then reload `/dashboard/finance`. Expected: the selector still shows "PHP" (the invalid stored value is rejected by `isCurrencyCode`, provider keeps its default) — not a crash, not "GBP" as a selected option.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/finance/layout.tsx
git commit -m "feat: add Finance layout mounting CurrencyProvider and selector"
```

---

### Task 6: Migrate KPI/table files (batch A)

**Files:**
- Modify: `src/app/dashboard/finance/page.tsx`
- Modify: `src/app/dashboard/finance/invoices/invoices-table.tsx`
- Modify: `src/app/dashboard/finance/expenses/expenses-table.tsx`
- Modify: `src/app/dashboard/finance/budgets/budgets-table.tsx`
- Modify: `src/app/dashboard/finance/payments/payments-table.tsx`

**Interfaces:**
- Consumes: `CurrencyAmount` from `src/components/shared/currency-amount.tsx` (Task 4).
- Produces: nothing consumed by later tasks — each of these 5 files is a leaf display, independent of the others.

- [ ] **Step 1: `src/app/dashboard/finance/page.tsx`**

Remove the local function (currently lines 29-31):
```ts
function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
```

Add the import near the top (alongside the other `@/components/...` imports):
```ts
import { CurrencyAmount } from "@/components/shared/currency-amount";
```

Replace the one call site (currently line 103):
```tsx
              <CardTitle className="text-2xl font-semibold">{formatCurrency(kpi.value)}</CardTitle>
```
with:
```tsx
              <CardTitle className="text-2xl font-semibold"><CurrencyAmount amountPhp={kpi.value} /></CardTitle>
```

- [ ] **Step 2: `src/app/dashboard/finance/invoices/invoices-table.tsx`**

Remove the local function (currently lines 47-49):
```ts
function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
```

Add the import:
```ts
import { CurrencyAmount } from "@/components/shared/currency-amount";
```

Replace the one on-screen call site (currently line 151):
```tsx
                <TableCell className="text-sm font-medium">{formatCurrency(invoice.totalAmount)}</TableCell>
```
with:
```tsx
                <TableCell className="text-sm font-medium"><CurrencyAmount amountPhp={invoice.totalAmount} /></TableCell>
```

Do NOT touch `exportCsv()` (around line 84-95) — it uses `i.totalAmount.toFixed(2)`, not `formatCurrency`, and stays exactly as-is (raw PHP decimal in the CSV, per Global Constraints).

- [ ] **Step 3: `src/app/dashboard/finance/expenses/expenses-table.tsx`**

Remove the local function (currently lines 67-69):
```ts
function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
```

Add the import:
```ts
import { CurrencyAmount } from "@/components/shared/currency-amount";
```

Replace both call sites. Currently line 214:
```tsx
            {filtered.length} record{filtered.length === 1 ? "" : "s"} · {formatCurrency(total)}
```
becomes:
```tsx
            {filtered.length} record{filtered.length === 1 ? "" : "s"} · <CurrencyAmount amountPhp={total} />
```

Currently line 284:
```tsx
                <TableCell className="text-sm font-medium">{formatCurrency(expense.amount + expense.taxAmount)}</TableCell>
```
becomes:
```tsx
                <TableCell className="text-sm font-medium"><CurrencyAmount amountPhp={expense.amount + expense.taxAmount} /></TableCell>
```

Do NOT touch `exportCsv()` (around line 192-206) — it uses `e.amount.toFixed(2)`, stays as-is.

- [ ] **Step 4: `src/app/dashboard/finance/budgets/budgets-table.tsx`**

Remove the local function (currently lines 27-29):
```ts
function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
```

Add the import:
```ts
import { CurrencyAmount } from "@/components/shared/currency-amount";
```

Replace the two lines (currently 124 and 126) that together contain 4 `formatCurrency(...)` calls:
```tsx
                  <span>
                    {formatCurrency(budget.actualSpending)} of {formatCurrency(budget.amount)} ({percent.toFixed(0)}%)
                  </span>
                  <span>{remaining >= 0 ? `${formatCurrency(remaining)} remaining` : `${formatCurrency(-remaining)} over`}</span>
```
becomes:
```tsx
                  <span>
                    <CurrencyAmount amountPhp={budget.actualSpending} /> of <CurrencyAmount amountPhp={budget.amount} /> ({percent.toFixed(0)}%)
                  </span>
                  <span>
                    {remaining >= 0 ? (
                      <><CurrencyAmount amountPhp={remaining} /> remaining</>
                    ) : (
                      <><CurrencyAmount amountPhp={-remaining} /> over</>
                    )}
                  </span>
```
(The second `<span>` can no longer use a template string once the amount is a component instead of a string, so it becomes a conditional JSX fragment instead of a template literal — same visible text, same logic.)

- [ ] **Step 5: `src/app/dashboard/finance/payments/payments-table.tsx`**

Remove the local function (currently lines 40-42):
```ts
function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
```

Add the import:
```ts
import { CurrencyAmount } from "@/components/shared/currency-amount";
```

Replace both call sites. Currently line 86:
```tsx
            {filtered.length} payment{filtered.length === 1 ? "" : "s"} · {formatCurrency(total)} completed
```
becomes:
```tsx
            {filtered.length} payment{filtered.length === 1 ? "" : "s"} · <CurrencyAmount amountPhp={total} /> completed
```

Currently line 135:
```tsx
                <TableCell className="text-sm font-medium">{formatCurrency(payment.amount)}</TableCell>
```
becomes:
```tsx
                <TableCell className="text-sm font-medium"><CurrencyAmount amountPhp={payment.amount} /></TableCell>
```

Do NOT touch `exportCsv()` (around line 66-78) — it uses `p.amount.toFixed(2)`, stays as-is.

- [ ] **Step 6: Typecheck and lint**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean. If `formatCurrency` is still referenced anywhere in these 5 files, typecheck/lint will catch the leftover reference — resolve before continuing.

- [ ] **Step 7: Manual check**

With `pnpm dev` running, visit `/dashboard/finance`, `/dashboard/finance/invoices`, `/dashboard/finance/expenses`, `/dashboard/finance/budgets`, `/dashboard/finance/payments` in turn. Expected on each: switching the currency selector (mounted once, in the layout, applies across all of them without a page reload) updates every visible amount consistently — KPI cards, table cells, budget progress lines, payment totals. Switching back to PHP restores the original numbers exactly (not a rounded/drifted value).

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/finance/page.tsx src/app/dashboard/finance/invoices/invoices-table.tsx src/app/dashboard/finance/expenses/expenses-table.tsx src/app/dashboard/finance/budgets/budgets-table.tsx src/app/dashboard/finance/payments/payments-table.tsx
git commit -m "feat: wire currency conversion into finance KPIs, invoices, expenses, budgets, payments tables"
```

---

### Task 7: Migrate remaining display files (batch B)

**Files:**
- Modify: `src/app/dashboard/finance/invoices/[id]/page.tsx`
- Modify: `src/app/dashboard/finance/invoices/[id]/payments-list.tsx`
- Modify: `src/app/dashboard/finance/statements/page.tsx`
- Modify: `src/app/dashboard/finance/invoices/invoice-form-dialog.tsx`

**Interfaces:**
- Consumes: `CurrencyAmount` from `src/components/shared/currency-amount.tsx` (Task 4).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: `src/app/dashboard/finance/invoices/[id]/page.tsx`**

Remove the local function (currently lines 15-17):
```ts
function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
```

Add the import:
```ts
import { CurrencyAmount } from "@/components/shared/currency-amount";
```

Replace the invoice line-items table rows (currently lines 111-119):
```tsx
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{Number(item.quantity)}</td>
                <td className="py-2 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                <td className="py-2 text-right">{Number(item.taxRate)}%</td>
                <td className="py-2 text-right">{formatCurrency(Number(item.lineTotal))}</td>
              </tr>
            ))}
```
with:
```tsx
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{Number(item.quantity)}</td>
                <td className="py-2 text-right"><CurrencyAmount amountPhp={Number(item.unitPrice)} /></td>
                <td className="py-2 text-right">{Number(item.taxRate)}%</td>
                <td className="py-2 text-right"><CurrencyAmount amountPhp={Number(item.lineTotal)} /></td>
              </tr>
            ))}
```

Replace the totals block (currently lines 123-130):
```tsx
        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-56 justify-between"><span>Subtotal</span><span>{formatCurrency(Number(invoice.subtotal))}</span></div>
          <div className="flex w-56 justify-between"><span>Tax</span><span>{formatCurrency(Number(invoice.taxAmount))}</span></div>
          <div className="flex w-56 justify-between"><span>Discount</span><span>-{formatCurrency(Number(invoice.discountAmount))}</span></div>
          <div className="flex w-56 justify-between font-semibold"><span>Total</span><span>{formatCurrency(Number(invoice.totalAmount))}</span></div>
          <div className="flex w-56 justify-between text-muted-foreground"><span>Paid</span><span>{formatCurrency(paidTotal)}</span></div>
          <div className="flex w-56 justify-between font-semibold text-navy"><span>Balance Due</span><span>{formatCurrency(balanceDue)}</span></div>
        </div>
```
with:
```tsx
        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-56 justify-between"><span>Subtotal</span><span><CurrencyAmount amountPhp={Number(invoice.subtotal)} /></span></div>
          <div className="flex w-56 justify-between"><span>Tax</span><span><CurrencyAmount amountPhp={Number(invoice.taxAmount)} /></span></div>
          <div className="flex w-56 justify-between"><span>Discount</span><span>-<CurrencyAmount amountPhp={Number(invoice.discountAmount)} /></span></div>
          <div className="flex w-56 justify-between font-semibold"><span>Total</span><span><CurrencyAmount amountPhp={Number(invoice.totalAmount)} /></span></div>
          <div className="flex w-56 justify-between text-muted-foreground"><span>Paid</span><span><CurrencyAmount amountPhp={paidTotal} /></span></div>
          <div className="flex w-56 justify-between font-semibold text-navy"><span>Balance Due</span><span><CurrencyAmount amountPhp={balanceDue} /></span></div>
        </div>
```

This page is the printable invoice document itself (`print:hidden` markers elsewhere in the file) — confirmed with the user that it converts along with everything else, same as every other Finance page.

- [ ] **Step 2: `src/app/dashboard/finance/invoices/[id]/payments-list.tsx`**

Remove the local function (currently lines 26-28):
```ts
function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
```

Add the import:
```ts
import { CurrencyAmount } from "@/components/shared/currency-amount";
```

Replace the one call site (currently line 55):
```tsx
            <TableCell className="text-sm font-medium">{formatCurrency(payment.amount)}</TableCell>
```
with:
```tsx
            <TableCell className="text-sm font-medium"><CurrencyAmount amountPhp={payment.amount} /></TableCell>
```

- [ ] **Step 3: `src/app/dashboard/finance/statements/page.tsx`**

Remove the local function (currently lines 25-27):
```ts
function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
```

Add the import:
```ts
import { CurrencyAmount } from "@/components/shared/currency-amount";
```

Replace the `Row` component's value display (currently lines 29-36):
```tsx
function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-border/60 py-2 text-sm ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}
```
with:
```tsx
function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-border/60 py-2 text-sm ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span><CurrencyAmount amountPhp={value} /></span>
    </div>
  );
}
```

- [ ] **Step 4: `src/app/dashboard/finance/invoices/invoice-form-dialog.tsx`**

Remove the local function (currently lines 45-47):
```ts
function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
```

Add the import:
```ts
import { CurrencyAmount } from "@/components/shared/currency-amount";
```

Replace the totals preview block (currently lines 270-275):
```tsx
          <div className="flex flex-col items-end gap-1 rounded-lg bg-secondary/40 p-3 text-sm">
            <div className="flex w-48 justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex w-48 justify-between"><span>Tax</span><span>{formatCurrency(taxTotal)}</span></div>
            <div className="flex w-48 justify-between"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>
            <div className="flex w-48 justify-between font-semibold"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
```
with:
```tsx
          <div className="flex flex-col items-end gap-1 rounded-lg bg-secondary/40 p-3 text-sm">
            <div className="flex w-48 justify-between"><span>Subtotal</span><span><CurrencyAmount amountPhp={subtotal} /></span></div>
            <div className="flex w-48 justify-between"><span>Tax</span><span><CurrencyAmount amountPhp={taxTotal} /></span></div>
            <div className="flex w-48 justify-between"><span>Discount</span><span>-<CurrencyAmount amountPhp={discountAmount} /></span></div>
            <div className="flex w-48 justify-between font-semibold"><span>Total</span><span><CurrencyAmount amountPhp={total} /></span></div>
          </div>
```

The actual input fields (quantity, unit price, discount — plain `<Input type="number">` elements elsewhere in this file) are untouched: they collect raw PHP numbers exactly as before. Only this computed preview display converts.

- [ ] **Step 5: Typecheck and lint**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean.

- [ ] **Step 6: Manual check**

Visit `/dashboard/finance/invoices`, open an existing invoice's detail page (`/dashboard/finance/invoices/[id]`), and open the "New Invoice"/edit dialog. Switch currencies. Expected: the invoice detail page's line items and totals convert; the payments list under it converts; the financial statements page (`/dashboard/finance/statements`) converts; the invoice form dialog's live Subtotal/Tax/Discount/Total preview converts as you add line items, while the quantity/unit price/discount input fields themselves keep showing plain numbers (unconverted) since those are raw PHP entry fields, not display.

- [ ] **Step 7: Commit**

```bash
git add "src/app/dashboard/finance/invoices/[id]/page.tsx" "src/app/dashboard/finance/invoices/[id]/payments-list.tsx" src/app/dashboard/finance/statements/page.tsx src/app/dashboard/finance/invoices/invoice-form-dialog.tsx
git commit -m "feat: wire currency conversion into invoice detail, payments list, statements, invoice form preview"
```

---

### Task 8: Migrate finance-charts.tsx (Recharts, hook-based)

**Files:**
- Modify: `src/app/dashboard/finance/finance-charts.tsx`

**Interfaces:**
- Consumes: `useCurrency` from `src/components/shared/currency-provider.tsx` (Task 3).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Move formatting from module scope into each component**

This file is already `"use client"` (Recharts requires it), but its 4 exported components currently share one module-level `formatCurrency` function — a hook can only be called inside a component body, so each of the 4 components needs its own `const { format } = useCurrency();` call, replacing the shared function.

Remove the module-level function (currently lines 21-23):
```ts
function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
```

Add the import at the top (after the `recharts` import block):
```ts
import { useCurrency } from "@/components/shared/currency-provider";
```

`MonthlyBarChart` (currently lines 25-49) — add the hook call as the first line of the function body, and change both `formatCurrency` references to `format`:
```tsx
export function MonthlyBarChart({
  data,
  dataKey,
  label,
  color,
}: {
  data: { label: string; revenue: number; expenses: number }[];
  dataKey: "revenue" | "expenses";
  label: string;
  color: string;
}) {
  const { format } = useCurrency();
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} tickFormatter={format} width={70} />
          <Tooltip formatter={(value) => format(Number(value))} />
          <Bar dataKey={dataKey} name={label} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

`RevenueVsExpensesChart` (currently lines 51-67) — same pattern:
```tsx
export function RevenueVsExpensesChart({ data }: { data: { label: string; revenue: number; expenses: number }[] }) {
  const { format } = useCurrency();
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} tickFormatter={format} width={70} />
          <Tooltip formatter={(value) => format(Number(value))} />
          <Legend />
          <Bar dataKey="revenue" name="Revenue" fill="#0a2540" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="#c9a036" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

`YearlyTrendChart` (currently lines 69-85) — same pattern:
```tsx
export function YearlyTrendChart({ data }: { data: { label: string; revenue: number; expenses: number }[] }) {
  const { format } = useCurrency();
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} tickFormatter={format} width={70} />
          <Tooltip formatter={(value) => format(Number(value))} />
          <Legend />
          <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0a2540" strokeWidth={2} />
          <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#c9a036" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

`BreakdownPieChart` (currently lines 87-107) — hook call goes after the early-return (a hook must run on every render, so it must be called before the conditional `return`, not after):
```tsx
export function BreakdownPieChart({ data }: { data: { name: string; amount: number }[] }) {
  const { format } = useCurrency();

  if (data.length === 0) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => format(Number(value))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

Note: the old module-level `formatCurrency` passed `maximumFractionDigits: 0` to trim decimals on chart axes/tooltips. `useCurrency().format()` (from Task 3) doesn't expose that option — chart values will now show cents (e.g. "₱1,234.00" instead of "₱1,234"). This is an accepted, minor cosmetic regression rather than plumbing a one-off formatting option through the shared hook for a single call site; if it looks cramped on the Y-axis in Step 3's manual check, note it as a follow-up, don't block on it.

- [ ] **Step 2: Typecheck and lint**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean. Pay attention to the `BreakdownPieChart` hook-before-early-return ordering — an eslint `react-hooks` rule will flag it immediately if it's wrong.

- [ ] **Step 3: Manual check**

Visit `/dashboard/finance` (the 4 charts render here: Monthly Revenue, Monthly Expenses, Revenue vs Expenses, Income by Service, Expense by Category, Yearly Financial Trend). Switch currency. Expected: Y-axis labels, tooltips on hover, and pie chart tooltips all update to the selected currency; no console errors; no "Rendered more hooks than during the previous render" React error (would indicate the `BreakdownPieChart` hook-ordering fix in Step 1 was done wrong).

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/finance/finance-charts.tsx
git commit -m "feat: wire currency conversion into finance charts"
```

---

### Task 9: Migrate reports/page.tsx + report-table.tsx (tagged-cell type)

**Files:**
- Modify: `src/components/shared/report-table.tsx`
- Modify: `src/app/dashboard/finance/reports/page.tsx`

**Interfaces:**
- Consumes: `CurrencyAmount` from `src/components/shared/currency-amount.tsx` (Task 4), `useCurrency` from `src/components/shared/currency-provider.tsx` (Task 3).
- Produces: `export type ReportCell = string | number | { phpAmount: number }` from `report-table.tsx` — `reports/page.tsx` imports and uses this type for its `rows` variable.

- [ ] **Step 1: Update `report-table.tsx`**

Full replacement content:

```tsx
"use client";

import { Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { useCurrency } from "./currency-provider";

export type ReportCell = string | number | { phpAmount: number };

function isPhpAmount(cell: ReportCell): cell is { phpAmount: number } {
  return typeof cell === "object" && cell !== null && "phpAmount" in cell;
}

export function ReportTable({
  title,
  columns,
  rows,
  filename,
}: {
  title: string;
  columns: string[];
  rows: ReportCell[][];
  filename: string;
}) {
  const { format } = useCurrency();

  function exportCsv() {
    const stringRows = rows.map((row) => row.map((cell) => (isPhpAmount(cell) ? format(cell.phpAmount) : String(cell))));
    downloadCsv(filename, buildCsv(columns, stringRows));
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No data for this period.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j} className={j === 0 ? "font-medium text-foreground" : "text-sm"}>
                    {isPhpAmount(cell) ? format(cell.phpAmount) : cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

`report-table.tsx` lives in `src/components/shared/`, the same directory as `currency-provider.tsx` — the import is `"./currency-provider"`, a relative sibling import, not a `@/` alias.

- [ ] **Step 2: Update `reports/page.tsx`**

Remove the local function (currently lines 24-26):
```ts
function currency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
```

Add the import (alongside the existing `ReportTable` import) and change it to also import the type:
```ts
import { ReportTable, type ReportCell } from "@/components/shared/report-table";
```
(This replaces the existing `import { ReportTable } from "@/components/shared/report-table";` line.)

Change the `rows` declaration (currently line 55):
```ts
  let rows: (string | number)[][] = [];
```
to:
```ts
  let rows: ReportCell[][] = [];
```

Replace every `currency(x)` call across all 12 report cases with `{ phpAmount: x }`. Every occurrence, by current line number:

Line 62: `rows = data.map((d) => [d.name, currency(d.amount)]);` → `rows = data.map((d) => [d.name, { phpAmount: d.amount }]);`

Line 69: `rows = data.map((d) => [d.name, currency(d.amount)]);` → `rows = data.map((d) => [d.name, { phpAmount: d.amount }]);`

Line 76: `rows = data.map((d) => [d.name, currency(d.amount)]);` → `rows = data.map((d) => [d.name, { phpAmount: d.amount }]);`

Line 83: `rows = data.map((d) => [d.name, currency(d.amount)]);` → `rows = data.map((d) => [d.name, { phpAmount: d.amount }]);`

Line 90: `rows = data.map((d) => [d.name, currency(d.amount)]);` → `rows = data.map((d) => [d.name, { phpAmount: d.amount }]);`

Line 97: `rows = data.map((d) => [d.name, currency(d.revenue), currency(d.expense), currency(d.profit)]);` → `rows = data.map((d) => [d.name, { phpAmount: d.revenue }, { phpAmount: d.expense }, { phpAmount: d.profit }]);`

Line 104: `rows = data.map((d) => [d.name, currency(d.revenue), currency(d.expense), currency(d.profit)]);` → `rows = data.map((d) => [d.name, { phpAmount: d.revenue }, { phpAmount: d.expense }, { phpAmount: d.profit }]);`

Line 111: `rows = data.map((d) => [d.name, d.projectCount, d.completedCount, currency(d.revenue)]);` → `rows = data.map((d) => [d.name, d.projectCount, d.completedCount, { phpAmount: d.revenue }]);`

Line 122: `rows = invoices.map((i) => [i.invoiceNumber, i.customer?.name ?? "—", dateStr(i.dueDate), currency(Number(i.totalAmount)), i.status]);` → `rows = invoices.map((i) => [i.invoiceNumber, i.customer?.name ?? "—", dateStr(i.dueDate), { phpAmount: Number(i.totalAmount) }, i.status]);`

Line 133: `rows = invoices.map((i) => [i.invoiceNumber, i.customer?.name ?? "—", dateStr(i.issueDate), currency(Number(i.totalAmount))]);` → `rows = invoices.map((i) => [i.invoiceNumber, i.customer?.name ?? "—", dateStr(i.issueDate), { phpAmount: Number(i.totalAmount) }]);`

Line 140: `rows = data.map((d) => [d.label, currency(d.revenue), currency(d.expenses), currency(d.revenue - d.expenses)]);` → `rows = data.map((d) => [d.label, { phpAmount: d.revenue }, { phpAmount: d.expenses }, { phpAmount: d.revenue - d.expenses }]);`

Line 147: `rows = data.map((d) => [d.label, currency(d.revenue), currency(d.expenses), currency(d.revenue - d.expenses)]);` → `rows = data.map((d) => [d.label, { phpAmount: d.revenue }, { phpAmount: d.expenses }, { phpAmount: d.revenue - d.expenses }]);`

The `dateStr()` helper function (lines 27-29) is untouched — dates aren't currency, stay as plain strings.

- [ ] **Step 3: Typecheck and lint**

```bash
pnpm typecheck
pnpm lint
```
Expected: both clean. If any `currency(...)` call was missed, TypeScript will flag it (the old `currency` function no longer exists, so a stray call site is a compile error, not a silent bug).

- [ ] **Step 4: Manual check**

Visit `/dashboard/finance/reports`. Try each report type from the dropdown (Revenue by Service, Revenue by Customer, Revenue by Branch, Expenses by Category, Expenses by Vendor, Project Profitability, Booking Profitability, Consultant Performance, Outstanding Invoices, Paid Invoices, Monthly Summary, Annual Summary). Expected: switching the currency selector updates every report's currency column(s); non-currency columns (names, project/completed counts, dates, invoice status) stay unchanged. Click "Export CSV" while a non-PHP currency is selected, open the downloaded file: currency columns show the converted, currency-symbol-formatted value (matching what was on screen), not a raw PHP number.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/report-table.tsx src/app/dashboard/finance/reports/page.tsx
git commit -m "feat: wire currency conversion into finance reports and CSV export"
```

---

### Task 10: Full verification pass

**Files:** None modified — this task only runs checks.

**Interfaces:** None.

- [ ] **Step 1: Static checks**

```bash
pnpm typecheck
pnpm lint
pnpm build
```
Expected: all three clean/succeed. Confirm no leftover references to any of the 10 deleted local `formatCurrency`/`currency` functions anywhere under `src/app/dashboard/finance/`:

```bash
grep -rn "function formatCurrency\|function currency(" src/app/dashboard/finance
```
Expected: no output (empty).

- [ ] **Step 2: Manual browser walkthrough**

With `pnpm dev` running, signed in as an ADMIN or MANAGER or FINANCE_OFFICER (not STAFF — several Finance pages are role-gated and STAFF sees an access-denied message instead):

- `/dashboard/finance` — selector visible, default PHP, KPI cards + 6 charts all convert together when switched.
- `/dashboard/finance/invoices` — table amounts convert; "Export" CSV button still produces raw PHP `.toFixed(2)` values regardless of selected currency (unchanged, pre-existing behavior).
- `/dashboard/finance/invoices/[id]` (open any invoice) — line items, totals, payments list all convert.
- `/dashboard/finance/expenses` — table amounts + summary line convert; CSV export unchanged (raw PHP).
- `/dashboard/finance/budgets` — progress lines convert.
- `/dashboard/finance/payments` — table amounts + summary line convert; CSV export unchanged (raw PHP).
- `/dashboard/finance/statements` — every row converts.
- `/dashboard/finance/reports` — every report type's currency columns convert; CSV export DOES match the selected currency (this one's different from invoices/expenses/payments — confirmed intentional in Task 9).
- Open the invoice create/edit dialog — Subtotal/Tax/Discount/Total preview converts; the quantity/unit price/discount input fields themselves stay plain PHP numbers.
- Reload the page after switching to USD or EUR — selection persists (localStorage), no flash back to a stale/wrong currency after the initial PHP-default flash.
- Open the Network tab, switch currencies a few times on `/dashboard/finance` — confirm zero new requests fire (rates were fetched once, server-side, by the layout; every toggle is pure client-side math against the same `initialRates` prop).
- Browser console: no errors on any of the above pages, no React hook-order warnings.

- [ ] **Step 3: Final commit (if any cleanup was needed)**

Only if Step 1–2 surfaced fixes:
```bash
git add -A
git commit -m "fix: address issues found in full verification pass"
```
