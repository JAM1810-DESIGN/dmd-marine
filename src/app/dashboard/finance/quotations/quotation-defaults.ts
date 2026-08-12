// Plain (non-"use client") module so these constants resolve to real values in
// both Server Components (e.g. new/page.tsx) and the client editor. Importing
// plain values from a "use client" module into a server file is unreliable —
// they can arrive as undefined — so shared quotation defaults live here.

export type QuotationItemDefault = { description: string; quantity: number; unitPrice: number };

export const DEFAULT_SCOPE = [
  "Attendance on board the vessel.",
  "Checking and recording the vessel's bunker ROB.",
  "Taking bunker tank measurements / sounding readings.",
  "Verification of bunker quantities based on available tank calibration tables.",
  "Recording fuel grades and quantities, including HFO, VLSFO, MGO/MDO, as applicable.",
  "Review of relevant bunker documents and vessel records.",
  "Preparation and issuance of an On-Hire / Off-Hire Bunker Survey Report (PDF by email).",
];

// Standard bunker-survey extra charges as their own line rows. They default to
// qty 0 so they list on the quotation (numbered after the base row) without
// inflating the total — staff set a qty when the charge applies and it flows
// into the Total.
export const DEFAULT_ADDITIONAL_ITEMS: QuotationItemDefault[] = [
  { description: "Additional attendance / re-attendance", quantity: 0, unitPrice: 250 },
  { description: "Waiting time exceeding 2 hours (per hour)", quantity: 0, unitPrice: 50 },
  { description: "Attendance outside normal working hours / weekends / holidays (per hour)", quantity: 0, unitPrice: 75 },
  { description: "Launch / boat transfer, if required (at cost)", quantity: 0, unitPrice: 0 },
  { description: "Transportation / special access charges, if applicable (at cost)", quantity: 0, unitPrice: 0 },
];

// The hardcoded Bunker Survey template: base survey row + the extras.
export const DEFAULT_ITEMS: QuotationItemDefault[] = [
  { description: "On/Off-Hire Bunker Survey – Port", quantity: 1, unitPrice: 350 },
  ...DEFAULT_ADDITIONAL_ITEMS,
];

// Vessel Condition Inspection has its own rate card (USD, different figures
// from the bunker set). Base row qty 1; extras qty 0 until they apply.
export const VESSEL_CONDITION_ITEMS: QuotationItemDefault[] = [
  { description: "Vessel Condition Inspection – Port", quantity: 1, unitPrice: 600 },
  { description: "Additional attendance / re-attendance", quantity: 0, unitPrice: 350 },
  { description: "Waiting time exceeding 2 hours (per hour)", quantity: 0, unitPrice: 60 },
  { description: "Night attendance / weekend / public holiday (per hour)", quantity: 0, unitPrice: 100 },
  { description: "Launch / boat transfer to anchorage (at cost)", quantity: 0, unitPrice: 0 },
  { description: "Transportation / port access / special permits (at cost)", quantity: 0, unitPrice: 0 },
];

export const VESSEL_CONDITION_SCOPE = [
  "General condition and appearance of the vessel.",
  "Hull and external structure, as accessible.",
  "Main deck, weather decks and superstructure.",
  "Accommodation and common areas.",
  "Navigation bridge and navigational equipment, visually inspected.",
  "Engine room and machinery spaces.",
  "Main engine and auxiliary machinery, visual condition.",
  "Pumps, piping and associated equipment, where accessible.",
  "Cargo holds / tanks, where accessible and safe to inspect.",
  "Mooring equipment, anchors and anchoring arrangements.",
  "Cargo handling equipment, where fitted.",
  "Lifesaving and firefighting equipment, visual condition.",
  "General safety and housekeeping condition.",
  "Evidence of corrosion, leakage, damage, deterioration or deficiencies.",
  "Relevant certificates and records made available on board.",
  "Photographic documentation of significant findings.",
];

export const VESSEL_CONDITION_REPORTING = [
  "Attendance and inspection by a qualified marine surveyor.",
  "Detailed inspection notes and observations.",
  "Photographs of relevant findings.",
  "Identification of apparent defects, deficiencies and areas requiring attention.",
  "Preparation of a Vessel Condition Inspection Report.",
  "Submission of the report in PDF format by email.",
];

export const VESSEL_CONDITION_CONDITIONS = [
  "1. The above rates are based on one vessel attendance and an inspection duration of up to 6 hours.",
  "2. The inspection is limited to areas that are safely accessible at the time of attendance.",
  "3. No dismantling, opening-up, testing or specialist examination is included unless specifically agreed.",
  "4. Waiting time exceeding 2 hours due to vessel, terminal, port or other operational delays will be charged at the applicable hourly rate.",
  "5. Launch/boat hire, transportation, port passes, permits and other third-party expenses will be charged at cost where applicable.",
  "6. Attendance outside normal working hours, weekends and public holidays will attract additional charges.",
  "7. Any additional attendance or re-inspection will be charged separately.",
  "8. The inspection is a visual condition assessment and does not constitute a class, statutory, thickness measurement, machinery performance or valuation survey unless specifically included in the scope.",
  "9. Any additional requirements outside the stated scope will be subject to a separate quotation.",
].join("\n");

export const DEFAULT_CONDITIONS =
  "Rates are based on one vessel attendance and one completed bunker survey during normal working hours. " +
  "Waiting time exceeding 2 hours, night attendance, weekends and public holidays are charged at the applicable extra rates. " +
  "Launch/boat charges, transportation, port passes and other third-party expenses, if required, are charged at cost. " +
  "Survey quantities are determined from vessel tank measurements, calibration tables and information available at attendance.";

export const DEFAULT_TERMS = "Within 30 days from invoice date, unless otherwise agreed.";
