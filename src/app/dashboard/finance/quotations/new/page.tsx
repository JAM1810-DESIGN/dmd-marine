import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { QuotationEditor, type QuotationTemplate } from "../quotation-editor";
import {
  DEFAULT_ADDITIONAL_ITEMS,
  VESSEL_CONDITION_ITEMS,
  VESSEL_CONDITION_SCOPE,
  VESSEL_CONDITION_REPORTING,
  VESSEL_CONDITION_CONDITIONS,
  CARGO_ITEMS,
  CARGO_SCOPE,
  CARGO_REPORTING,
  CARGO_CONDITIONS,
  PREPURCHASE_ITEMS,
  PREPURCHASE_SCOPE,
  PREPURCHASE_REPORTING,
  PREPURCHASE_EXCLUSIONS,
  PREPURCHASE_CONDITIONS,
  PREPURCHASE_PAYMENT_TERMS,
  CARGOHOLD_ITEMS,
  CARGOHOLD_SCOPE,
  CARGOHOLD_REPORTING,
  CARGOHOLD_CONDITIONS,
  MENTORING_ITEMS,
  MENTORING_SCOPE,
  MENTORING_SECTIONS,
  MENTORING_CONDITIONS,
  MENTORING_PAYMENT_TERMS,
  BTM_ITEMS,
  BTM_SCOPE,
  BTM_REPORTING,
  BTM_CONDITIONS,
  DECK_ITEMS,
  DECK_SCOPE,
  DECK_REPORTING,
  DECK_CONDITIONS,
  NAV_ITEMS,
  NAV_SCOPE,
  NAV_REPORTING,
  NAV_CONDITIONS,
  COMENTOR_ITEMS,
  COMENTOR_SCOPE,
  COMENTOR_SECTIONS,
  COMENTOR_CONDITIONS,
  DRAFTFORM_ITEMS,
  DRAFTFORM_SCOPE,
  DRAFTFORM_SECTIONS,
  DRAFTFORM_CONDITIONS,
  DRAFTFORM_PAYMENT_TERMS,
  ONHIRE_ITEMS,
  ONHIRE_SCOPE,
  ONHIRE_REPORTING,
  ONHIRE_CONDITIONS,
  ONHIREBUNKER_ITEMS,
  ONHIREBUNKER_SCOPE,
  ONHIREBUNKER_SECTIONS,
  ONHIREBUNKER_CONDITIONS,
  DRAFTSURVEY_ITEMS,
  DRAFTSURVEY_SCOPE,
  DRAFTSURVEY_CONDITIONS,
  BUNKERSURVEY_ITEMS,
  BUNKERSURVEY_SCOPE,
  BUNKERSURVEY_REPORTING,
  BUNKERSURVEY_CONDITIONS,
  type QuotationSection,
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
  searchParams: Promise<{ template?: string; email?: string; name?: string; returnEmail?: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "FINANCE_OFFICER") {
    return <AccessDenied message="Quotations are restricted to Admin, Manager, and Finance Officer roles." />;
  }

  const { template: templateKey, email, name, returnEmail } = await searchParams;

  // When launched from a message thread, carry the customer + return address so
  // the created quotation can be attached back to that conversation.
  const carry: Record<string, string> = {};
  if (email) carry.email = email;
  if (name) carry.name = name;
  if (returnEmail) carry.returnEmail = returnEmail;

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
    ...services.map((service): TemplateDef => {
      const base = service.basePrice ? Number(service.basePrice) : 0;
      const scope = service.scope
        ? service.scope.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean)
        : [];
      const name = service.name.toLowerCase();

      // Fully-specified service templates with their own USD rate card, scope,
      // reporting/exclusions sections and commercial conditions.
      type CustomDoc = {
        title?: string;
        scopeTitle: string;
        scope: string[];
        reporting: string[];
        exclusions: string[];
        sections?: QuotationSection[];
        conditions: string;
        items: typeof VESSEL_CONDITION_ITEMS;
        location?: string;
        paymentTerms?: string;
      };
      const customDocs: Record<string, CustomDoc | undefined> = {
        vesselCondition: name.includes("vessel condition inspection")
          ? {
              scopeTitle: "Scope of Inspection",
              scope: VESSEL_CONDITION_SCOPE,
              reporting: VESSEL_CONDITION_REPORTING,
              exclusions: [],
              conditions: VESSEL_CONDITION_CONDITIONS,
              items: VESSEL_CONDITION_ITEMS,
            }
          : undefined,
        cargo: name.includes("cargo operation support")
          ? {
              scopeTitle: "Scope of Service",
              scope: CARGO_SCOPE,
              reporting: CARGO_REPORTING,
              exclusions: [],
              conditions: CARGO_CONDITIONS,
              items: CARGO_ITEMS,
              location: "Philippines – Port / Anchorage / Terminal",
            }
          : undefined,
        prePurchase: name.includes("pre-purchase")
          ? {
              scopeTitle: "Scope of Inspection",
              scope: PREPURCHASE_SCOPE,
              reporting: PREPURCHASE_REPORTING,
              exclusions: PREPURCHASE_EXCLUSIONS,
              conditions: PREPURCHASE_CONDITIONS,
              items: PREPURCHASE_ITEMS,
              paymentTerms: PREPURCHASE_PAYMENT_TERMS,
            }
          : undefined,
        cargoHold: name.includes("hold inspection")
          ? {
              scopeTitle: "Scope of Inspection",
              scope: CARGOHOLD_SCOPE,
              reporting: CARGOHOLD_REPORTING,
              exclusions: [],
              conditions: CARGOHOLD_CONDITIONS,
              items: CARGOHOLD_ITEMS,
            }
          : undefined,
        mentoring: name.includes("master mentoring")
          ? {
              title: "Individual Master Mentoring Program",
              scopeTitle: "Scope of Mentoring",
              scope: MENTORING_SCOPE,
              reporting: [],
              exclusions: [],
              sections: MENTORING_SECTIONS,
              conditions: MENTORING_CONDITIONS,
              items: MENTORING_ITEMS,
              location: "Online / Remote Mentoring",
              paymentTerms: MENTORING_PAYMENT_TERMS,
            }
          : undefined,
        btm: name.includes("bridge team management")
          ? {
              scopeTitle: "Scope of Service",
              scope: BTM_SCOPE,
              reporting: BTM_REPORTING,
              exclusions: [],
              conditions: BTM_CONDITIONS,
              items: BTM_ITEMS,
              location: "Philippines – Onboard Vessel / Port / Anchorage / At Sea",
            }
          : undefined,
        deck: name.includes("deck operation")
          ? {
              scopeTitle: "Scope of Consulting",
              scope: DECK_SCOPE,
              reporting: DECK_REPORTING,
              exclusions: [],
              conditions: DECK_CONDITIONS,
              items: DECK_ITEMS,
            }
          : undefined,
        navAudit: name.includes("navigation audit")
          ? {
              scopeTitle: "Scope of Audit",
              scope: NAV_SCOPE,
              reporting: NAV_REPORTING,
              exclusions: [],
              conditions: NAV_CONDITIONS,
              items: NAV_ITEMS,
              location: "Philippines – Port / Anchorage / At Sea",
            }
          : undefined,
        chiefMentoring: name.includes("chief officer mentoring")
          ? {
              title: "Individual Chief Officer Mentoring",
              scopeTitle: "Scope of Mentoring",
              scope: COMENTOR_SCOPE,
              reporting: [],
              exclusions: [],
              sections: COMENTOR_SECTIONS,
              conditions: COMENTOR_CONDITIONS,
              items: COMENTOR_ITEMS,
              location: "Online / Remote",
              paymentTerms: MENTORING_PAYMENT_TERMS,
            }
          : undefined,
        draftForm: name.includes("vessel-specific draft survey")
          ? {
              title: "Vessel-Specific Draft Survey Form Development",
              scopeTitle: "Scope of Service",
              scope: DRAFTFORM_SCOPE,
              reporting: [],
              exclusions: [],
              sections: DRAFTFORM_SECTIONS,
              conditions: DRAFTFORM_CONDITIONS,
              items: DRAFTFORM_ITEMS,
              location: "Online / Remote",
              paymentTerms: DRAFTFORM_PAYMENT_TERMS,
            }
          : undefined,
        onHire: name.includes("condition survey")
          ? {
              title: "On-Hire / Off-Hire Condition Survey",
              scopeTitle: "Scope of Survey",
              scope: ONHIRE_SCOPE,
              reporting: ONHIRE_REPORTING,
              exclusions: [],
              conditions: ONHIRE_CONDITIONS,
              items: ONHIRE_ITEMS,
            }
          : undefined,
        onHireBunker: name.includes("bunker") && name.includes("hire")
          ? {
              title: "On-Hire / Off-Hire Bunker Survey",
              scopeTitle: "Scope of Survey",
              scope: ONHIREBUNKER_SCOPE,
              reporting: [],
              exclusions: [],
              sections: ONHIREBUNKER_SECTIONS,
              conditions: ONHIREBUNKER_CONDITIONS,
              items: ONHIREBUNKER_ITEMS,
            }
          : undefined,
        draftSurvey: name.includes("draft survey") && !name.includes("develop")
          ? {
              title: "Draft Survey – Ship Attendance",
              scopeTitle: "Scope of Attendance",
              scope: DRAFTSURVEY_SCOPE,
              reporting: [],
              exclusions: [],
              conditions: DRAFTSURVEY_CONDITIONS,
              items: DRAFTSURVEY_ITEMS,
            }
          : undefined,
        bunkerSurvey: name.includes("bunker") && !name.includes("hire")
          ? {
              title: "Bunker Quantity Survey",
              scopeTitle: "Scope of Survey",
              scope: BUNKERSURVEY_SCOPE,
              reporting: BUNKERSURVEY_REPORTING,
              exclusions: [],
              conditions: BUNKERSURVEY_CONDITIONS,
              items: BUNKERSURVEY_ITEMS,
            }
          : undefined,
      };
      const doc =
        customDocs.vesselCondition ??
        customDocs.cargo ??
        customDocs.prePurchase ??
        customDocs.cargoHold ??
        customDocs.mentoring ??
        customDocs.btm ??
        customDocs.deck ??
        customDocs.navAudit ??
        customDocs.chiefMentoring ??
        customDocs.draftForm ??
        customDocs.onHire ??
        customDocs.onHireBunker ??
        customDocs.draftSurvey ??
        customDocs.bunkerSurvey;
      if (doc) {
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
      exclusions: def.exclusions,
      sections: def.sections,
      conditions: def.conditions,
      paymentTerms: def.paymentTerms,
      items: def.items,
    };
    return (
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/finance/quotations/new" className="no-print inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Choose a different template
        </Link>
        <QuotationEditor
          customers={customers}
          template={template}
          prefillBillTo={name}
          returnEmail={returnEmail}
        />
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
      <TemplatePicker templates={pickerTemplates} carry={carry} />
    </div>
  );
}
