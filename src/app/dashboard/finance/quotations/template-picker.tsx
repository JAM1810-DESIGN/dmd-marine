"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, FilePlus, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PickerTemplate = {
  key: string;
  label: string;
  category: string;
  currency: string;
  hint: string;
  items: { description: string; quantity: number; unitPrice: number }[];
};

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TemplatePicker({
  templates,
  carry = {},
}: {
  templates: PickerTemplate[];
  carry?: Record<string, string>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState(templates[0]?.key ?? "");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.label.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }, [templates, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, PickerTemplate[]>();
    for (const t of filtered) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const selected = templates.find((t) => t.key === selectedKey) ?? filtered[0] ?? null;
  const total = selected ? selected.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) : 0;

  function use() {
    if (!selected) return;
    const params = new URLSearchParams({ ...carry, template: selected.key });
    router.push(`/dashboard/finance/quotations/new?${params.toString()}`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* Template list */}
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-none px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-[28rem] overflow-y-auto">
          {grouped.map(([category, list]) => (
            <div key={category}>
              <p className="bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                {category}
              </p>
              {list.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelectedKey(t.key)}
                  className={cn(
                    "flex w-full items-center gap-2.5 border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-secondary/40",
                    selectedKey === t.key && "bg-secondary/60",
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
                    {t.key === "blank" ? <FilePlus className="size-4" /> : <FileText className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{t.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{t.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          ))}
          {grouped.length === 0 && <p className="p-4 text-sm text-muted-foreground">No matching services.</p>}
        </div>
      </div>

      {/* Preview */}
      <div className="flex flex-col rounded-xl bg-secondary/30 p-4 ring-1 ring-foreground/10">
        {selected && (
          <>
            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between bg-[#12395f] px-4 py-2.5 text-white">
                <span className="text-sm font-semibold tracking-wide">DMD MARINE</span>
                <span className="text-xs opacity-90">QUOTATION · auto number</span>
              </div>
              <div className="p-4 text-neutral-900">
                <p className="mb-2 font-semibold">{selected.label}</p>
                <table className="w-full text-sm">
                  <tbody>
                    {selected.items.map((item, i) => (
                      <tr key={i} className="border-b border-neutral-100">
                        <td className="py-1">{item.description || <span className="text-neutral-400">(line item)</span>}</td>
                        <td className="py-1 text-right text-neutral-500">×{item.quantity}</td>
                        <td className="py-1 text-right tabular-nums">{money(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex justify-between border-t-2 border-[#12395f] pt-1.5 text-base font-bold text-[#12395f]">
                  <span>Total ({selected.currency})</span>
                  <span className="tabular-nums">{money(total)}</span>
                </div>
                <p className="mt-2 text-[11px] text-neutral-500">Scope, commercial conditions, validity &amp; payment terms are included — all editable after you open it.</p>
              </div>
            </div>
            <Button onClick={use} className="mt-3 self-end">
              Use this template
              <ArrowRight className="size-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
