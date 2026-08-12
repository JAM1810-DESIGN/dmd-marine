import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { QuotationEditor, type QuotationTemplate } from "../quotation-editor";
import {
  DEFAULT_SCOPE,
  DEFAULT_CONDITIONS,
  DEFAULT_ITEMS,
  DEFAULT_ADDITIONAL_ITEMS,
  VESSEL_CONDITION_ITEMS,
  VESSEL_CONDITION_SCOPE,
  VESSEL_CONDITION_REPORTING,
  VESSEL_CONDITION_CONDITIONS,
  CARGO_ITEMS,
  CARGO_SCOPE,
  CARGO_REPORTING,
  CARGO_CONDITIONS,
} from "../quotation-defaults";
import { TemplatePicker, type PickerTemplate } from "../template-picker";

export const metadata: Metadata = { title: "New Quotation" };

const GENERIC_CONDITIONS =
  "Rates are based on the scope described above during normal working hours. Additional work, travel time, " +
  "or third-party costs (transport, port passes, permits), if required, are charged at cost and quoted separately.";

type TemplateDef = QuotationTemplate & { key: string; label: string; category: string; hint: string };

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "FINANCE_OFFICER") {
    return <AccessDenied message="Quotations are restricted to Admin, Manager, and Finance Officer roles." />;
  }

  const { template: templateKey } = await searchParams;

  const [customers, services] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, basePrice: true, scope: true, category: { select: { name: true } } },
    }),
  ]);

  const php = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

  const templates: TemplateDef[] = [
    {
      key: "bunker",
      label: "On/Off-Hire Bunker Survey",
      category: "Surveys",
      hint: "Full rate table + scope + terms",
      title: "On/Off-Hire Bunker Survey",
      currency: "USD",
      scope: DEFAULT_SCOPE,
      conditions: DEFAULT_CONDITIONS,
      items: DEFAULT_ITEMS,
    },
    ...services.map((service): TemplateDef => {
      const base = service.basePrice ? Number(service.basePrice) : 0;
      const scope = service.scope
        ? service.scope.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean)
        : [];
      const name = service.name.toLowerCase();

      // Fully-specified service templates with their own USD rate card, scope,
      // reporting section and commercial conditions.
      const isVesselCondition = name.includes("vessel condition inspection");
      const isCargo = name.includes("cargo operation support");
      if (isVesselCondition || isCargo) {
        const doc = isVesselCondition
          ? {
              scopeTitle: "Scope of Inspection",
              scope: VESSEL_CONDITION_SCOPE,
              reporting: VESSEL_CONDITION_REPORTING,
              conditions: VESSEL_CONDITION_CONDITIONS,
              items: VESSEL_CONDITION_ITEMS,
              location: undefined as string | undefined,
            }
          : {
              scopeTitle: "Scope of Service",
              scope: CARGO_SCOPE,
              reporting: CARGO_REPORTING,
              conditions: CARGO_CONDITIONS,
              items: CARGO_ITEMS,
              location: "Philippines – Port / Anchorage / Terminal" as string | undefined,
            };
        return {
          key: service.id,
          label: service.name,
          category: service.category?.name ?? "Services",
          hint: "Full rate card + scope + reporting",
          title: service.name,
          currency: "USD",
          ...doc,
        };
      }

      // Other attendance-type surveys (Bunker, Draft, On-/Off-Hire) carry the
      // standard bunker extra-charge rows. "Develop … Draft Survey Form" is a
      // deliverable, not an attendance, so it's excluded.
      const carriesExtras =
        name.includes("bunker") ||
        name.includes("on-hire") ||
        name.includes("off-hire") ||
        (name.includes("draft survey") && !name.includes("develop"));

      const items = carriesExtras
        ? [{ description: service.name, quantity: 1, unitPrice: base }, ...DEFAULT_ADDITIONAL_ITEMS]
        : [{ description: service.name, quantity: 1, unitPrice: base }];

      return {
        key: service.id,
        label: service.name,
        category: service.category?.name ?? "Services",
        hint: base > 0 ? `From ${php(base)}` : "On request",
        title: service.name,
        currency: "PHP",
        scope,
        conditions: GENERIC_CONDITIONS,
        items,
      };
    }),
    {
      key: "blank",
      label: "Blank quotation",
      category: "Blank",
      hint: "Start from scratch",
      title: "Service Quotation",
      currency: "PHP",
      scope: [],
      conditions: "",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  ];

  // A template was chosen → open the editable quotation prefilled from it.
  if (templateKey) {
    const def = templates.find((t) => t.key === templateKey) ?? templates[0];
    const template: QuotationTemplate = {
      title: def.title,
      currency: def.currency,
      location: def.location,
      scopeTitle: def.scopeTitle,
      scope: def.scope,
      reporting: def.reporting,
      conditions: def.conditions,
      items: def.items,
    };
    return (
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/finance/quotations/new" className="no-print inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Choose a different template
        </Link>
        <QuotationEditor customers={customers} template={template} />
      </div>
    );
  }

  // No template yet → show the picker.
  const pickerTemplates: PickerTemplate[] = templates.map((t) => ({
    key: t.key,
    label: t.label,
    category: t.category,
    currency: t.currency,
    hint: t.hint,
    items: t.items,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/dashboard/finance/quotations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to Quotations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New quotation</h1>
        <p className="text-sm text-muted-foreground">Pick a service template — the quotation opens fully editable.</p>
      </div>
      <TemplatePicker templates={pickerTemplates} />
    </div>
  );
}
