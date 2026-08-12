"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { createQuotation, updateQuotation, type ActionState } from "./actions";
import { DEFAULT_SCOPE, DEFAULT_CONDITIONS, DEFAULT_ITEMS, DEFAULT_TERMS } from "./quotation-defaults";

export type QuotationRecord = {
  id: string;
  quoteNumber: string;
  title: string;
  billTo: string;
  attention: string | null;
  vesselName: string | null;
  location: string | null;
  currency: string;
  quoteDate: string;
  validityDays: number;
  paymentTerms: string | null;
  conditions: string | null;
  scopeTitle: string | null;
  scope: string[];
  reporting: string[];
  exclusions: string[];
  taxRatePercent: number;
  customerId: string | null;
  items: { description: string; quantity: number; unitPrice: number }[];
};

type ItemState = { description: string; quantity: number; unitPrice: number };

export type QuotationTemplate = {
  title: string;
  currency: string;
  location?: string;
  scopeTitle?: string;
  scope: string[];
  reporting?: string[];
  exclusions?: string[];
  conditions: string;
  paymentTerms?: string;
  items: ItemState[];
};

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function QuotationEditor({
  quotation,
  customers,
  template,
}: {
  quotation?: QuotationRecord;
  customers: { id: string; name: string }[];
  template?: QuotationTemplate;
}) {
  const router = useRouter();
  const existing = Boolean(quotation);
  const action = quotation ? updateQuotation.bind(null, quotation.id) : createQuotation;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  const [title, setTitle] = useState(quotation?.title ?? template?.title ?? "On/Off-Hire Bunker Survey");
  const [billTo, setBillTo] = useState(quotation?.billTo ?? "");
  const [attention, setAttention] = useState(quotation?.attention ?? "");
  const [vesselName, setVesselName] = useState(quotation?.vesselName ?? "");
  const [location, setLocation] = useState(quotation?.location ?? template?.location ?? "Philippines – Port / Anchorage / Shipyard");
  const [currency, setCurrency] = useState(quotation?.currency ?? template?.currency ?? "USD");
  const [quoteDate, setQuoteDate] = useState(quotation?.quoteDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [validityDays, setValidityDays] = useState(quotation?.validityDays ?? 30);
  const [paymentTerms, setPaymentTerms] = useState(quotation?.paymentTerms ?? template?.paymentTerms ?? DEFAULT_TERMS);
  const [conditions, setConditions] = useState(quotation?.conditions ?? template?.conditions ?? DEFAULT_CONDITIONS);
  const [taxRatePercent, setTaxRatePercent] = useState(quotation?.taxRatePercent ?? 0);
  const [customerId, setCustomerId] = useState(quotation?.customerId ?? "");
  const [scopeTitle, setScopeTitle] = useState(
    quotation?.scopeTitle ?? template?.scopeTitle ?? "Scope of survey",
  );
  const [scope, setScope] = useState<string[]>(
    quotation?.scope?.length ? quotation.scope : (template?.scope ?? DEFAULT_SCOPE),
  );
  const [reporting, setReporting] = useState<string[]>(
    quotation?.reporting?.length ? quotation.reporting : (template?.reporting ?? []),
  );
  const [exclusions, setExclusions] = useState<string[]>(
    quotation?.exclusions?.length ? quotation.exclusions : (template?.exclusions ?? []),
  );

  // Section numbers shift with which optional sections are present.
  let sectionNo = 2; // Scope is always section 2.
  const reportingNo = reporting.length > 0 ? ++sectionNo : 0;
  const exclusionsNo = exclusions.length > 0 ? ++sectionNo : 0;
  const conditionsNo = ++sectionNo;
  const [items, setItems] = useState<ItemState[]>(
    quotation?.items?.length
      ? quotation.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice }))
      : (template?.items ?? DEFAULT_ITEMS),
  );

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [items]);
  const tax = subtotal * (Number(taxRatePercent) || 0) / 100;
  const total = subtotal + tax;

  useEffect(() => {
    if (state.success && state.id) {
      notify.success(existing ? "Quotation saved" : "Quotation created");
      router.push(`/dashboard/finance/quotations/${state.id}`);
    }
  }, [state.success, state.id, existing, router]);

  function setItem(index: number, patch: Partial<ItemState>) {
    setItems((cur) => cur.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function pickCustomer(id: string) {
    setCustomerId(id);
    if (id) {
      const name = customers.find((c) => c.id === id)?.name;
      if (name && !billTo.trim()) setBillTo(name);
    }
  }

  const inp = "w-full rounded border border-border bg-transparent px-1.5 py-0.5 text-sm outline-none focus:border-ring";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Toolbar (not printed) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <label className="flex items-center gap-1">
            Customer:
            <select
              className="rounded border border-border bg-transparent px-2 py-1 text-sm"
              value={customerId}
              onChange={(e) => pickCustomer(e.target.value)}
            >
              <option value="">— none —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print / PDF
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            <Save className="size-4" />
            {pending ? "Saving..." : existing ? "Save" : "Create"}
          </Button>
        </div>
      </div>

      {state.error && <p className="no-print text-sm font-medium text-destructive">{state.error}</p>}

      {/* Hidden serialized fields */}
      <input type="hidden" name="items" value={JSON.stringify(items)} readOnly />
      <input type="hidden" name="scope" value={JSON.stringify(scope)} readOnly />
      <input type="hidden" name="taxRatePercent" value={String(taxRatePercent)} readOnly />
      <input type="hidden" name="customerId" value={customerId} readOnly />
      <input type="hidden" name="title" value={title} readOnly />
      <input type="hidden" name="billTo" value={billTo} readOnly />
      <input type="hidden" name="attention" value={attention} readOnly />
      <input type="hidden" name="vesselName" value={vesselName} readOnly />
      <input type="hidden" name="location" value={location} readOnly />
      <input type="hidden" name="currency" value={currency} readOnly />
      <input type="hidden" name="quoteDate" value={quoteDate} readOnly />
      <input type="hidden" name="validityDays" value={String(validityDays)} readOnly />
      <input type="hidden" name="paymentTerms" value={paymentTerms} readOnly />
      <input type="hidden" name="conditions" value={conditions} readOnly />
      <input type="hidden" name="scopeTitle" value={scopeTitle} readOnly />
      <input type="hidden" name="reporting" value={JSON.stringify(reporting)} readOnly />
      <input type="hidden" name="exclusions" value={JSON.stringify(exclusions)} readOnly />

      {/* The printable document */}
      <div className="print-doc mx-auto w-full max-w-3xl overflow-hidden rounded-xl bg-white text-neutral-900 ring-1 ring-foreground/10">
        <div className="flex items-start justify-between bg-[#12395f] px-6 py-4 text-white">
          <div>
            <div className="text-lg font-semibold tracking-wide">DMD MARINE</div>
            <div className="text-[10px] tracking-[0.15em] opacity-85">CONSULTATION AND SERVICES</div>
          </div>
          <div className="text-right text-xs">
            <div className="text-sm font-semibold">QUOTATION</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-0.5 w-52 rounded border border-white/30 bg-transparent px-1 text-right text-xs text-white outline-none" />
            <div className="mt-1 font-mono text-[11px] opacity-90">{quotation?.quoteNumber ?? "QT-— (auto)"}</div>
          </div>
        </div>

        <div className="p-6 text-neutral-900">
          <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <label className="flex items-center gap-2"><span className="w-16 shrink-0 text-neutral-500">Bill to</span><input value={billTo} onChange={(e) => setBillTo(e.target.value)} className={inp} placeholder="Client name" /></label>
            <label className="flex items-center gap-2"><span className="w-16 shrink-0 text-neutral-500">Date</span><input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className={inp} /></label>
            <label className="flex items-center gap-2"><span className="w-16 shrink-0 text-neutral-500">Attn</span><input value={attention} onChange={(e) => setAttention(e.target.value)} className={inp} placeholder="Contact / dept." /></label>
            <label className="flex items-center gap-2"><span className="w-16 shrink-0 text-neutral-500">Vessel</span><input value={vesselName} onChange={(e) => setVesselName(e.target.value)} className={inp} placeholder="Vessel name" /></label>
            <label className="flex items-center gap-2"><span className="w-16 shrink-0 text-neutral-500">Location</span><input value={location} onChange={(e) => setLocation(e.target.value)} className={inp} /></label>
            <label className="flex items-center gap-2"><span className="w-16 shrink-0 text-neutral-500">Currency</span><input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inp + " w-20"} /></label>
          </div>

          <div className="mb-2 rounded bg-[#f3e6c4] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#6b5310]">
            1. Survey attendance &amp; reporting
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-100 text-[11px] uppercase text-neutral-500">
                <th className="border border-neutral-200 px-2 py-1 text-left" style={{ width: 34 }}>#</th>
                <th className="border border-neutral-200 px-2 py-1 text-left">Location / service</th>
                <th className="border border-neutral-200 px-2 py-1 text-right" style={{ width: 70 }}>Qty</th>
                <th className="border border-neutral-200 px-2 py-1 text-right" style={{ width: 110 }}>Rate</th>
                <th className="border border-neutral-200 px-2 py-1 text-right" style={{ width: 110 }}>Amount</th>
                <th className="no-print border border-neutral-200 px-1 py-1" style={{ width: 34 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-neutral-200 px-2 py-1">{index + 1}</td>
                  <td className="border border-neutral-200 px-1 py-0.5">
                    <input value={item.description} onChange={(e) => setItem(index, { description: e.target.value })} className="w-full bg-transparent px-1 outline-none" />
                  </td>
                  <td className="border border-neutral-200 px-1 py-0.5 text-right">
                    <input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => setItem(index, { quantity: Number(e.target.value) || 0 })} className="w-full bg-transparent px-1 text-right outline-none" />
                  </td>
                  <td className="border border-neutral-200 px-1 py-0.5 text-right">
                    <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => setItem(index, { unitPrice: Number(e.target.value) || 0 })} className="w-full bg-transparent px-1 text-right outline-none" />
                  </td>
                  <td className="border border-neutral-200 px-2 py-1 text-right tabular-nums">{money(item.quantity * item.unitPrice)}</td>
                  <td className="no-print border border-neutral-200 px-1 py-0.5 text-center">
                    <button type="button" aria-label="Remove line" disabled={items.length === 1} onClick={() => setItems((cur) => cur.filter((_, i) => i !== index))} className="text-neutral-400 hover:text-red-600 disabled:opacity-30">
                      <Trash2 className="mx-auto size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => setItems((cur) => [...cur, { description: "", quantity: 1, unitPrice: 0 }])} className="no-print mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
            <Plus className="size-3.5" /> Add line
          </button>

          <div className="mt-3 flex justify-end">
            <div className="w-64 text-sm">
              <div className="flex justify-between py-0.5"><span>Subtotal</span><span className="tabular-nums">{currency} {money(subtotal)}</span></div>
              <div className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-1">Tax
                  <input type="number" min="0" max="100" step="0.01" value={taxRatePercent} onChange={(e) => setTaxRatePercent(Number(e.target.value) || 0)} className="w-14 rounded border border-border bg-transparent px-1 text-right outline-none" />%
                </span>
                <span className="tabular-nums">{money(tax)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t-2 border-[#12395f] pt-1.5 text-base font-bold text-[#12395f]"><span>Total</span><span className="tabular-nums">{currency} {money(total)}</span></div>
            </div>
          </div>

          <div className="mb-2 mt-5 flex items-center gap-1 rounded bg-[#f3e6c4] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#6b5310]">
            <span>2.</span>
            <input value={scopeTitle} onChange={(e) => setScopeTitle(e.target.value)} className="flex-1 bg-transparent uppercase tracking-wide outline-none" />
          </div>
          <ul className="flex flex-col gap-1">
            {scope.map((line, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-400" />
                <input value={line} onChange={(e) => setScope((cur) => cur.map((l, i) => (i === index ? e.target.value : l)))} className="w-full bg-transparent outline-none" />
                <button type="button" aria-label="Remove scope line" onClick={() => setScope((cur) => cur.filter((_, i) => i !== index))} className="no-print text-neutral-400 hover:text-red-600">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setScope((cur) => [...cur, ""])} className="no-print mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
            <Plus className="size-3.5" /> Add scope line
          </button>

          {reporting.length > 0 && (
            <>
              <div className="mb-2 mt-5 rounded bg-[#f3e6c4] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#6b5310]">
                {reportingNo}. Reporting
              </div>
              <ul className="flex flex-col gap-1">
                {reporting.map((line, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-400" />
                    <input value={line} onChange={(e) => setReporting((cur) => cur.map((l, i) => (i === index ? e.target.value : l)))} className="w-full bg-transparent outline-none" />
                    <button type="button" aria-label="Remove reporting line" onClick={() => setReporting((cur) => cur.filter((_, i) => i !== index))} className="no-print text-neutral-400 hover:text-red-600">
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setReporting((cur) => [...cur, ""])} className="no-print mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
                <Plus className="size-3.5" /> Add reporting line
              </button>
            </>
          )}

          {exclusions.length > 0 && (
            <>
              <div className="mb-2 mt-5 rounded bg-[#f3e6c4] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#6b5310]">
                {exclusionsNo}. Exclusions
              </div>
              <ul className="flex flex-col gap-1">
                {exclusions.map((line, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-400" />
                    <input value={line} onChange={(e) => setExclusions((cur) => cur.map((l, i) => (i === index ? e.target.value : l)))} className="w-full bg-transparent outline-none" />
                    <button type="button" aria-label="Remove exclusion line" onClick={() => setExclusions((cur) => cur.filter((_, i) => i !== index))} className="no-print text-neutral-400 hover:text-red-600">
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setExclusions((cur) => [...cur, ""])} className="no-print mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
                <Plus className="size-3.5" /> Add exclusion line
              </button>
            </>
          )}

          <div className="mb-2 mt-5 rounded bg-[#f3e6c4] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#6b5310]">
            {conditionsNo}. Commercial conditions
          </div>
          <textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={reporting.length > 0 ? 10 : 4} className="w-full rounded border border-border bg-transparent p-2 text-sm outline-none focus:border-ring" />
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2"><span className="shrink-0 text-neutral-500">Validity (days)</span><input type="number" min="0" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value) || 0)} className={inp + " w-20"} /></label>
            <label className="flex items-center gap-2"><span className="shrink-0 text-neutral-500">Payment terms</span><input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className={inp} /></label>
          </div>
          <p className="mt-3 text-[11px] text-neutral-500">VAT, withholding tax or other statutory charges, if applicable, are excluded unless specifically stated otherwise.</p>
        </div>
      </div>
    </form>
  );
}
