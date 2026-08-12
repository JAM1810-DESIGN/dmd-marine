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

// ── Cargo Operation Support ────────────────────────────────────────────────
export const CARGO_ITEMS: QuotationItemDefault[] = [
  { description: "Cargo Loading Operation Support – Port (per day)", quantity: 1, unitPrice: 600 },
  { description: "Cargo Discharging Operation Support – Port (per day)", quantity: 0, unitPrice: 600 },
  { description: "Loading / Discharging Operation – Anchorage (per day)", quantity: 0, unitPrice: 750 },
  { description: "Additional operation day / continuation (per day)", quantity: 0, unitPrice: 500 },
  { description: "Waiting time exceeding 2 hours (per hour)", quantity: 0, unitPrice: 60 },
  { description: "Night attendance / weekend / public holiday (per hour)", quantity: 0, unitPrice: 100 },
  { description: "Launch / boat transfer to anchorage (at cost)", quantity: 0, unitPrice: 0 },
  { description: "Transportation / port access / special permits (at cost)", quantity: 0, unitPrice: 0 },
];

export const CARGO_SCOPE = [
  "Pre-operation review and discussion of cargo operations.",
  "Monitoring of cargo loading and/or discharging operations.",
  "Monitoring of loading/discharging sequence and operational progress.",
  "Coordination with the Master, Chief Officer, terminal and relevant parties.",
  "Observation of cargo handling equipment and connections, where applicable.",
  "Monitoring of cargo and ballast-related operational considerations.",
  "Identification of apparent operational risks, damage or deficiencies.",
  "General operational advice to the vessel's Master and deck team.",
  "Assistance with cargo operation documentation and records.",
  "Photographic documentation of significant findings, where required.",
];

export const CARGO_REPORTING = [
  "Daily attendance by a qualified marine professional.",
  "Monitoring and operational support during the agreed attendance period.",
  "Daily operational observations, where required.",
  "Photographs of significant findings.",
  "Identification of apparent deficiencies or operational concerns.",
  "Preparation of a Cargo Operation Support Report upon completion.",
  "Submission of the report in PDF format by email.",
];

export const CARGO_CONDITIONS = [
  "1. The above rates are based on up to 8 hours of attendance per operational day.",
  "2. The number of operational days will be based on the actual loading/discharging schedule and may be extended upon request.",
  "3. For operations extending beyond the initially quoted period, each additional day will be charged at the applicable Additional Operation Day rate.",
  "4. Waiting time exceeding 2 hours due to vessel, terminal, cargo, port or other operational delays will be charged at USD 60.00/hour.",
  "5. Night attendance, weekends and public holidays will attract additional charges as stated above.",
  "6. Launch/boat hire, transportation, port passes, permits and other third-party expenses will be charged at cost where applicable.",
  "7. The service is provided as operational support and advisory assistance and does not replace the responsibilities of the Master, Chief Officer, terminal or cargo interests.",
  "8. The service does not include independent cargo quantity measurement, draft survey, ullage survey, cargo condition survey, laboratory testing or certification unless specifically agreed.",
  "9. Any additional requirements outside the stated scope will be subject to a separate quotation.",
  "",
  "Examples (illustrative): 2-day port operation – USD 1,100.00; 3-day port operation – USD 1,600.00; 2-day anchorage operation – USD 1,350.00; 3-day anchorage operation – USD 1,850.00.",
].join("\n");

// ── Pre-Purchase / S&P Vessel Inspection ───────────────────────────────────
export const PREPURCHASE_ITEMS: QuotationItemDefault[] = [
  { description: "Pre-Purchase Inspection – Port", quantity: 1, unitPrice: 1500 },
  { description: "Pre-Purchase Inspection – Anchorage", quantity: 0, unitPrice: 1750 },
  { description: "Pre-Purchase Inspection – Shipyard", quantity: 0, unitPrice: 1500 },
  { description: "Additional attendance / re-attendance", quantity: 0, unitPrice: 750 },
  { description: "Additional surveyor, if required (per day)", quantity: 0, unitPrice: 500 },
  { description: "Waiting time exceeding 2 hours (per hour)", quantity: 0, unitPrice: 75 },
  { description: "Night attendance / weekend / public holiday (per hour)", quantity: 0, unitPrice: 125 },
  { description: "Launch / boat transfer to anchorage (at cost)", quantity: 0, unitPrice: 0 },
  { description: "Travel, accommodation and other out-of-town expenses (at cost)", quantity: 0, unitPrice: 0 },
];

export const PREPURCHASE_SCOPE = [
  "The pre-purchase inspection will include, as applicable and safely accessible:",
  "A. General / External Condition",
  "General condition and appearance of vessel.",
  "Hull and external structure.",
  "Main deck and weather decks.",
  "Superstructure and accommodation.",
  "Corrosion, wastage, cracks, deformation and visible repairs.",
  "Condition of shell plating and exposed areas.",
  "B. Deck & Mooring Equipment",
  "Anchors and anchor chains.",
  "Windlass and mooring machinery.",
  "Mooring winches and associated equipment.",
  "Fairleads, bollards and deck fittings.",
  "Hatch covers and closing arrangements, where fitted.",
  "Deck piping, valves and visible fittings.",
  "C. Cargo Spaces",
  "Cargo holds / tanks, where accessible.",
  "Internal structure and visible condition.",
  "Tank tops, bulkheads, frames and stiffeners.",
  "Cargo handling equipment, where fitted.",
  "Bilge and drainage arrangements.",
  "D. Machinery Spaces",
  "Main engine and associated machinery – visual condition.",
  "Auxiliary engines and generators.",
  "Boilers / exhaust systems, where fitted.",
  "Pumps, compressors and other auxiliary machinery.",
  "Piping, valves and visible machinery components.",
  "General cleanliness, leakage and maintenance condition.",
  "E. Bridge / Navigation",
  "Navigation bridge and equipment.",
  "Steering arrangements.",
  "Communication equipment.",
  "Navigation equipment, based on visual inspection and documents provided.",
  "F. Safety / LSA / FFA",
  "Lifeboats / rescue boats, where accessible.",
  "Life-saving appliances.",
  "Firefighting equipment and systems.",
  "Emergency equipment.",
  "General safety arrangements.",
  "G. Accommodation",
  "Cabins and living spaces.",
  "Galley and sanitary spaces.",
  "General condition and housekeeping.",
  "Air-conditioning and ventilation systems, where accessible.",
  "H. Documents & Records (review, where made available)",
  "Class certificates and status.",
  "Statutory certificates.",
  "Previous survey reports.",
  "Maintenance records.",
  "Dry-docking records.",
  "Defect / repair records.",
  "Machinery records.",
  "Relevant trading and operational history.",
];

export const PREPURCHASE_REPORTING = [
  "The fee includes preparation of a Pre-Purchase Vessel Inspection Report, including:",
  "Executive summary.",
  "General vessel particulars.",
  "Detailed observations by area/system.",
  "Photographic record.",
  "Identification of apparent defects and deficiencies.",
  "Assessment of general condition.",
  "Identification of significant maintenance / repair items.",
  "Recommendations for further investigation or repair, where appropriate.",
  "Review of available class and statutory information.",
  "Overall condition assessment based on the inspection performed.",
  "The final report will be submitted in PDF format by email.",
];

export const PREPURCHASE_EXCLUSIONS = [
  "Unless specifically agreed, the following are excluded:",
  "Dry-docking survey.",
  "Underwater hull inspection.",
  "Ultrasonic thickness measurement (UTM).",
  "Non-destructive testing (NDT).",
  "Oil / fuel / lube oil laboratory analysis.",
  "Machinery performance testing.",
  "Engine dismantling or opening-up.",
  "Crane / lifting appliance load testing.",
  "Tank cleaning or gas-freeing.",
  "Diving services.",
  "Sea trial attendance.",
  "Class/statutory certification.",
  "Valuation of the vessel.",
  "Any of the above services can be arranged separately upon request.",
];

export const PREPURCHASE_CONDITIONS = [
  "1. The above professional fee is based on one vessel attendance of up to 8 hours.",
  "2. Inspection will be carried out on a visual and operational basis where practicable.",
  "3. All areas inspected must be safely accessible and adequately lit.",
  "4. The vessel's crew shall provide reasonable assistance and access to relevant areas.",
  "5. Any waiting time exceeding 2 hours due to vessel or operational delays will be charged at the applicable rate.",
  "6. Additional attendance or re-inspection will be charged separately.",
  "7. Launch/boat hire, transportation, accommodation, port passes, permits and other third-party expenses will be charged at cost.",
  "8. Any requirement for specialist testing or additional survey work will be subject to separate quotation.",
  "9. The inspection represents the surveyor's findings based on the condition visible and accessible at the time of inspection and should not be considered a guarantee of the vessel's future performance or condition.",
].join("\n");

export const PREPURCHASE_PAYMENT_TERMS =
  "50% upon confirmation and 50% upon submission of the final report, unless otherwise agreed.";

// ── Cargo Hold Inspection ──────────────────────────────────────────────────
export const CARGOHOLD_ITEMS: QuotationItemDefault[] = [
  { description: "Cargo Hold Inspection – Port", quantity: 1, unitPrice: 600 },
  { description: "Cargo Hold Inspection – Anchorage", quantity: 0, unitPrice: 750 },
  { description: "Cargo Hold Inspection – Shipyard", quantity: 0, unitPrice: 600 },
  { description: "Additional attendance / re-attendance", quantity: 0, unitPrice: 350 },
  { description: "Waiting time exceeding 2 hours (per hour)", quantity: 0, unitPrice: 60 },
  { description: "Night attendance / weekend / public holiday (per hour)", quantity: 0, unitPrice: 100 },
  { description: "Launch / boat transfer to anchorage (at cost)", quantity: 0, unitPrice: 0 },
  { description: "Transportation / port access / special permits (at cost)", quantity: 0, unitPrice: 0 },
];

export const CARGOHOLD_SCOPE = [
  "The inspection will generally cover the condition of the vessel's cargo holds and associated areas, including:",
  "General condition and cleanliness of cargo holds.",
  "Condition of hold tank tops, floors, bulkheads and side structures, as accessible.",
  "Examination of hold plating and visible structural members.",
  "Condition of hatch coamings, hatch covers and associated fittings, where accessible.",
  "Inspection of hatch cover sealing arrangements and rubber packing, where accessible.",
  "Condition of ladders, access arrangements, platforms and handrails.",
  "Evidence of corrosion, wastage, cracks, deformation, damage or deterioration.",
  "Evidence of leakage, water ingress, oil contamination or other contamination.",
  "Condition of bilge wells, bilge covers and drainage arrangements, where accessible.",
  "Condition of manholes, access covers and associated fittings.",
  "Condition of cargo hold ventilation arrangements, where accessible.",
  "Condition of hold lighting and electrical fittings, visually inspected.",
  "Condition of cargo securing arrangements, where fitted.",
  "Condition of tank top and areas relevant to cargo operations.",
  "General suitability and apparent readiness of the holds for intended cargo, subject to the agreed inspection purpose.",
  "Identification of loose scale, flaking paint, residues, standing water or other visible deficiencies.",
  "Photographic documentation of significant findings.",
];

export const CARGOHOLD_REPORTING = [
  "Attendance and inspection by a qualified marine surveyor.",
  "Visual examination of accessible cargo holds and associated fittings.",
  "Detailed inspection notes and observations.",
  "Photographs of relevant findings.",
  "Identification of apparent defects, deficiencies and areas requiring attention.",
  "Assessment of the general apparent condition of the cargo holds.",
  "Preparation of a Cargo Hold Inspection Report.",
  "Submission of the report in PDF format by email.",
];

export const CARGOHOLD_CONDITIONS = [
  "1. The above rates are based on one vessel attendance and an inspection duration of up to 6 hours.",
  "2. The inspection is limited to cargo holds and associated areas that are safely accessible at the time of attendance.",
  "3. Cargo holds must be safely accessible and, where applicable, adequately ventilated, gas-free and prepared for inspection.",
  "4. No entry into enclosed or hazardous spaces will be undertaken unless appropriate safety requirements and permits are in place.",
  "5. No dismantling, opening-up, testing, thickness measurement or specialist examination is included unless specifically agreed.",
  "6. Waiting time exceeding 2 hours due to vessel, terminal, port or other operational delays will be charged at the applicable hourly rate.",
  "7. Launch/boat hire, transportation, port passes, permits and other third-party expenses will be charged at cost where applicable.",
  "8. Attendance outside normal working hours, weekends and public holidays will attract additional charges.",
  "9. Any additional attendance or re-inspection will be charged separately.",
  "10. The inspection is a visual cargo hold condition assessment and does not constitute a class, statutory, structural thickness measurement, ultrasonic testing, coating inspection, gas-free certification or cargo suitability certification unless specifically included in the scope.",
  "11. The surveyor will not enter cargo holds or other spaces where safe access, lighting, ventilation, atmosphere or other required safety conditions are not provided.",
  "12. Any additional requirements outside the stated scope will be subject to a separate quotation.",
].join("\n");

// A titled, bulleted section that can appear between Scope and Commercial
// Conditions. Lets templates define arbitrary sections beyond the fixed ones.
export type QuotationSection = { title: string; lines: string[] };

// ── Individual Master Mentoring Program ────────────────────────────────────
export const MENTORING_ITEMS: QuotationItemDefault[] = [
  { description: "Master Mentoring – 3 Months", quantity: 1, unitPrice: 300 },
  { description: "Master Mentoring – 6 Months", quantity: 0, unitPrice: 550 },
  { description: "Master Mentoring – 9 Months", quantity: 0, unitPrice: 750 },
  { description: "Master Mentoring – 12 Months", quantity: 0, unitPrice: 900 },
];

export const MENTORING_SCOPE = [
  "The program is designed for an individual officer who is newly appointed, newly promoted or preparing to take up the position of Master and would benefit from practical guidance and one-to-one professional mentoring.",
  "The participant may initially enroll for 3 months and may choose to extend the mentoring period to 6, 9 or 12 months.",
  "The mentoring program will focus on the practical transition into the Master's role, including:",
  "Understanding the responsibilities and expectations of the Master.",
  "Transition from Chief Officer / senior officer to Master.",
  "Leadership and management of the shipboard team.",
  "Decision-making and professional judgement.",
  "Bridge management and navigational leadership.",
  "Passage planning and voyage preparation.",
  "Bridge Team Management and effective delegation.",
  "Communication with officers, crew and shore management.",
  "Managing difficult situations and operational pressures.",
  "Safety Management System (SMS) awareness and practical application.",
  "Risk assessment and safe operational decision-making.",
  "Emergency preparedness and response.",
  "Incident, near-miss and deficiency management.",
  "Preparation for Port State Control, Flag State, Class and other inspections.",
  "Managing external inspectors and auditors professionally.",
  "Port arrival, departure, mooring and anchoring considerations.",
  "Cargo operation supervision, where applicable.",
  "Crew discipline, motivation and welfare.",
  "Master's standing orders and shipboard instructions.",
  "Review of reports, checklists and important shipboard documentation.",
  "Lessons learned from practical operational situations.",
  "Professional development and confidence building.",
  "General guidance on challenges encountered by a newly appointed Master.",
];

export const MENTORING_SECTIONS: QuotationSection[] = [
  {
    title: "Mentoring Approach",
    lines: [
      "The mentoring is intended to be personal, practical and confidential, allowing the officer to discuss actual situations and challenges encountered in the position.",
      "Mentoring may include:",
      "One-to-one online mentoring sessions.",
      "Discussion of actual shipboard situations.",
      "Questions and answers on Master's duties and responsibilities.",
      "Review of selected documents or scenarios provided by the participant.",
      "Practical advice based on the mentor's professional experience.",
      "Guidance before and after important operations or inspections.",
      "Discussion of lessons learned and alternative approaches.",
      "Personal development recommendations.",
      "The participant is encouraged to raise real operational situations with the mentor so that the mentoring can be tailored to the individual's experience and development needs.",
    ],
  },
  {
    title: "Suggested Program Structure",
    lines: [
      "Month 1 – Transition to Master. Focus on:",
      "Role and responsibilities of the Master.",
      "Leadership and authority.",
      "Managing the bridge team and crew.",
      "Communication with shore management.",
      "Decision-making and risk management.",
      "Understanding the expectations of the Company and vessel.",
      "Month 2 – Operational Confidence. Focus on:",
      "Navigation and voyage management.",
      "Port operations.",
      "Cargo and mooring operations.",
      "Emergency preparedness.",
      "Safety management.",
      "Inspections, audits and deficiencies.",
      "Managing operational pressure.",
      "Month 3 – Consolidation. Focus on:",
      "Review of challenges encountered.",
      "Lessons learned.",
      "Improvement of leadership and decision-making.",
      "Areas requiring further development.",
      "Personal action plan for continued development.",
      "For 6, 9 or 12-month programs, the mentoring continues with progressively deeper guidance based on the participant's actual experience and development needs.",
    ],
  },
  {
    title: "Deliverables",
    lines: [
      "The selected mentoring program includes:",
      "Initial one-to-one mentoring discussion.",
      "Regular mentoring sessions during the selected period.",
      "Professional advice and practical guidance.",
      "Discussion of actual operational situations.",
      "Review of relevant documents or scenarios, where appropriate.",
      "Personal development recommendations.",
      "Progress discussions throughout the program.",
      "Final mentoring summary and recommendations upon completion.",
    ],
  },
];

export const MENTORING_CONDITIONS = [
  "1. The minimum mentoring engagement is 3 months.",
  "2. The participant may select a 3, 6, 9 or 12-month mentoring period.",
  "3. The participant may initially commence with the 3-month program and extend the mentoring period by mutual agreement.",
  "4. The mentoring program is provided to the individual officer and is not intended to replace Company training, statutory certification, STCW requirements, SMS procedures or other mandatory training.",
  "5. The mentor provides professional guidance and advice based on experience. The participant remains responsible for operational decisions made onboard the vessel.",
  "6. No guarantee is given regarding the outcome of PSC inspections, audits, examinations, promotions or Company assessments.",
  "7. Mentoring sessions will normally be conducted remotely by online meeting, telephone or other mutually agreed communication method.",
  "8. The participant is responsible for providing any documents or information required for discussion, subject to confidentiality and Company requirements.",
  "9. Physical attendance onboard, travel, accommodation or additional training outside the mentoring program is excluded and may be quoted separately.",
  "10. All discussions between the participant and mentor will be treated as confidential, subject to applicable legal or professional obligations.",
  "",
  "Recommended starting option: 3-Month Individual Master Mentoring Program – USD 300.00.",
].join("\n");

export const MENTORING_PAYMENT_TERMS =
  "Payment in advance for the selected mentoring period, unless otherwise agreed.";

// ── Bridge Team Management Support ─────────────────────────────────────────
export const BTM_ITEMS: QuotationItemDefault[] = [
  { description: "Bridge Team Management Support – Port / Anchorage (per day)", quantity: 1, unitPrice: 600 },
  { description: "Bridge Team Management Support – At Sea (per day)", quantity: 0, unitPrice: 750 },
  { description: "Additional operation / attendance day (per day)", quantity: 0, unitPrice: 500 },
  { description: "Waiting time exceeding 2 hours (per hour)", quantity: 0, unitPrice: 60 },
  { description: "Night attendance / weekend / public holiday (per hour)", quantity: 0, unitPrice: 100 },
  { description: "Travel / transportation / port access (at cost)", quantity: 0, unitPrice: 0 },
];

export const BTM_SCOPE = [
  "The Bridge Team Management support will generally cover:",
  "Assessment of bridge team organisation and coordination.",
  "Review of bridge team roles and responsibilities.",
  "Bridge watchkeeping practices and effective communication.",
  "Passage planning and voyage preparation.",
  "Monitoring of navigational practices and situational awareness.",
  "Application of COLREGs and safe navigation principles.",
  "Use and management of bridge navigational equipment.",
  "Master–Pilot information exchange and coordination.",
  "Pilotage and arrival/departure procedures.",
  "Bridge team communication and closed-loop communication.",
  "Workload management and appropriate delegation.",
  "Identification and management of navigational risks.",
  "Monitoring of position fixing and cross-checking practices.",
  "Radar, ECDIS and visual navigation practices, as applicable.",
  "Anchoring and berthing/departure bridge procedures.",
  "Emergency and contingency preparedness.",
  "Identification of deficiencies and areas requiring improvement.",
  "Practical coaching and recommendations to bridge team members.",
];

export const BTM_REPORTING = [
  "Attendance by a qualified maritime professional.",
  "Observation and assessment of bridge team practices.",
  "Discussion and coaching with the Master and bridge team.",
  "Identification of strengths, deficiencies and areas for improvement.",
  "Practical recommendations for improving bridge team performance.",
  "Preparation of a Bridge Team Management Observation Report.",
  "Submission of the report in PDF format by email.",
];

export const BTM_CONDITIONS = [
  "1. The above rates are based on up to 8 hours of attendance per day.",
  "2. The service may be arranged for 1 day or extended over multiple days, depending on the vessel's operational requirements.",
  "3. Additional attendance days will be charged at the applicable daily rate.",
  "4. Waiting time exceeding 2 hours due to vessel, port, terminal, pilot or other operational delays will be charged at USD 60.00/hour.",
  "5. Attendance outside normal working hours, weekends and public holidays will attract additional charges.",
  "6. Travel, transportation, accommodation, port passes, permits and other third-party expenses will be charged at cost where applicable.",
  "7. The service is intended as assessment, coaching and operational support and does not replace the responsibilities of the Master, bridge team or Company.",
  "8. No navigational equipment testing, calibration, statutory certification or Class survey is included unless specifically agreed.",
  "9. Any additional requirements outside the stated scope will be subject to a separate quotation.",
].join("\n");

// ── Deck Operation Consulting ──────────────────────────────────────────────
export const DECK_ITEMS: QuotationItemDefault[] = [
  { description: "Deck Operation Consulting – Port (per day)", quantity: 1, unitPrice: 500 },
  { description: "Deck Operation Consulting – Anchorage (per day)", quantity: 0, unitPrice: 600 },
  { description: "Deck Operation Consulting – Shipyard (per day)", quantity: 0, unitPrice: 500 },
  { description: "Additional day / re-attendance (per day)", quantity: 0, unitPrice: 400 },
  { description: "Waiting time exceeding 2 hours (per hour)", quantity: 0, unitPrice: 50 },
  { description: "Night / weekend / public holiday attendance (per hour)", quantity: 0, unitPrice: 75 },
  { description: "Transportation / port access / permits (at cost)", quantity: 0, unitPrice: 0 },
];

export const DECK_SCOPE = [
  "The consulting will generally cover:",
  "Review of deck operations and working practices.",
  "Mooring and anchoring operations.",
  "Cargo and deck operation preparation.",
  "Deck crew organisation and supervision.",
  "Safe working practices and risk assessment.",
  "Permit-to-work and toolbox meeting practices.",
  "Deck machinery and equipment operations.",
  "Cargo securing and lashing, where applicable.",
  "Lifting operations and safe working practices.",
  "Housekeeping and maintenance of deck areas.",
  "Identification of operational risks and deficiencies.",
  "Practical advice to the Master, Chief Officer and deck team.",
];

export const DECK_REPORTING = [
  "Attendance by a qualified maritime professional.",
  "Operational observations and consultation.",
  "Practical recommendations and guidance.",
  "Photographs of significant findings, where applicable.",
  "Brief Deck Operation Consulting Report by email.",
];

export const DECK_CONDITIONS = [
  "1. The above rates are based on one attendance of up to 8 hours per day.",
  "2. For operations requiring 2–3 days or longer, the applicable daily rate will be charged for each day of attendance.",
  "3. Additional days will be charged at the applicable Additional Day / Re-attendance rate.",
  "4. Waiting time exceeding 2 hours due to vessel, terminal, port or operational delays will be charged at USD 50.00/hour.",
  "5. Night attendance, weekends and public holidays will attract additional charges.",
  "6. Transportation, port passes, permits, launch/boat hire and other third-party expenses will be charged at cost.",
  "7. The service is advisory and does not replace the operational responsibilities of the Master, Chief Officer, vessel crew or Company.",
  "8. Any requirements outside the stated scope will be subject to a separate quotation.",
].join("\n");

// ── Navigational Audit ─────────────────────────────────────────────────────
export const NAV_ITEMS: QuotationItemDefault[] = [
  { description: "Navigational Audit – Port (per day)", quantity: 1, unitPrice: 500 },
  { description: "Navigational Audit – Anchorage (per day)", quantity: 0, unitPrice: 600 },
  { description: "Navigational Audit – At Sea (per day)", quantity: 0, unitPrice: 700 },
  { description: "Additional day / re-audit (per day)", quantity: 0, unitPrice: 400 },
  { description: "Waiting time exceeding 2 hours (per hour)", quantity: 0, unitPrice: 50 },
  { description: "Night / weekend / public holiday attendance (per hour)", quantity: 0, unitPrice: 75 },
  { description: "Transportation / port access / permits (at cost)", quantity: 0, unitPrice: 0 },
];

export const NAV_SCOPE = [
  "The navigational audit will generally cover:",
  "Bridge team organisation and watchkeeping practices.",
  "Passage planning and voyage preparation.",
  "ECDIS, radar and navigational equipment practices.",
  "Position fixing and cross-checking procedures.",
  "Compliance with COLREGs and safe navigation practices.",
  "Master's standing orders and night orders.",
  "Bridge procedures, checklists and records.",
  "Pilotage and Master–Pilot exchange of information.",
  "Arrival, departure and anchoring procedures.",
  "Navigational risk assessment.",
  "Bridge team communication and workload management.",
  "Review of relevant navigational records and documentation.",
  "Identification of deficiencies, unsafe practices and areas requiring improvement.",
];

export const NAV_REPORTING = [
  "Attendance by a qualified maritime professional.",
  "Review and assessment of navigational practices.",
  "Review of relevant bridge records and documentation.",
  "Identification of observations and deficiencies.",
  "Practical recommendations and corrective actions.",
  "Photographs of significant findings, where appropriate.",
  "Preparation of a Navigational Audit Report.",
  "Submission of the report in PDF format by email.",
];

export const NAV_CONDITIONS = [
  "1. The above rates are based on one attendance of up to 8 hours per day.",
  "2. For audits requiring 2 or more days, the applicable daily rate will be charged for each day of attendance.",
  "3. Additional days or re-audits will be charged at the applicable additional-day rate.",
  "4. Waiting time exceeding 2 hours due to vessel, port, terminal, pilot or operational delays will be charged at USD 50.00/hour.",
  "5. Night attendance, weekends and public holidays will attract additional charges.",
  "6. Transportation, port passes, permits, accommodation and other third-party expenses will be charged at cost where applicable.",
  "7. The audit is an independent navigational assessment and does not constitute a Class, Flag State, statutory or Port State Control inspection.",
  "8. No calibration, repair or specialist testing of navigational equipment is included.",
  "9. Any additional requirements outside the stated scope will be subject to a separate quotation.",
].join("\n");

// ── Individual Chief Officer Mentoring ─────────────────────────────────────
export const COMENTOR_ITEMS: QuotationItemDefault[] = [
  { description: "Chief Officer Mentoring – 3 Months", quantity: 1, unitPrice: 300 },
  { description: "Chief Officer Mentoring – 6 Months", quantity: 0, unitPrice: 550 },
  { description: "Chief Officer Mentoring – 9 Months", quantity: 0, unitPrice: 750 },
  { description: "Chief Officer Mentoring – 12 Months", quantity: 0, unitPrice: 900 },
];

export const COMENTOR_SCOPE = [
  "The program is designed for an officer who is newly appointed, newly promoted or preparing to take up the position of Chief Officer and requires practical guidance and professional mentoring.",
  "The participant may start with the 3-month program and extend the mentoring period to 6, 9 or 12 months.",
  "The mentoring will generally cover:",
  "Chief Officer's duties and responsibilities.",
  "Transition into the Chief Officer position.",
  "Deck department leadership and crew management.",
  "Cargo planning, loading and discharging operations.",
  "Cargo care, securing and monitoring.",
  "Stability, ballast and draft considerations.",
  "Mooring and anchoring operations.",
  "Deck maintenance and planned maintenance coordination.",
  "Safety Management System and risk assessment.",
  "Permit-to-work and toolbox meeting practices.",
  "Enclosed space entry and safe working practices.",
  "Preparation for PSC, Class, Flag State and Company inspections.",
  "Management of deficiencies and corrective actions.",
  "Communication with the Master, crew and shore management.",
  "Supervision and delegation of deck officers and ratings.",
  "Handling operational challenges and decision-making.",
  "Review of practical shipboard situations and lessons learned.",
  "Professional development and confidence building.",
];

export const COMENTOR_SECTIONS: QuotationSection[] = [
  {
    title: "Mentoring Service",
    lines: [
      "The mentoring fee includes:",
      "One-to-one mentoring with an experienced maritime professional.",
      "Scheduled online mentoring sessions.",
      "Practical advice based on the participant's actual situations.",
      "Discussion and guidance on Chief Officer responsibilities.",
      "Review of selected documents or operational scenarios, where appropriate.",
      "Ongoing professional support during the selected mentoring period.",
    ],
  },
];

export const COMENTOR_CONDITIONS = [
  "1. The minimum mentoring period is 3 months.",
  "2. The participant may select a 3, 6, 9 or 12-month mentoring period.",
  "3. The mentoring is provided on an individual basis and is intended as professional guidance and support.",
  "4. The mentoring does not replace statutory training, certification, Company SMS requirements or other mandatory requirements.",
  "5. The participant remains responsible for operational decisions and actions taken onboard.",
  "6. Mentoring will normally be conducted remotely by online meeting, telephone or other agreed communication method.",
  "7. Physical attendance, travel or additional training outside the stated scope will be subject to a separate quotation.",
].join("\n");

// ── Vessel-Specific Draft Survey Form Development ──────────────────────────
export const DRAFTFORM_ITEMS: QuotationItemDefault[] = [
  { description: "Vessel-Specific Draft Survey Form Development", quantity: 1, unitPrice: 300 },
  { description: "Additional revision / modification (per revision)", quantity: 0, unitPrice: 50 },
  { description: "Additional vessel / separate form (per vessel)", quantity: 0, unitPrice: 200 },
];

export const DRAFTFORM_SCOPE = [
  "The service is intended for Chief Officers who require a draft survey form specifically prepared for their vessel.",
  "The service will generally include:",
  "Review of vessel particulars and relevant information provided by the Chief Officer.",
  "Development of a vessel-specific draft survey calculation form.",
  "Incorporation of vessel-specific draft marks and applicable information.",
  "Preparation of ballast, fresh water, fuel oil and other relevant correction fields.",
  "Hydrostatic data input, where provided.",
  "Preparation of displacement and deadweight calculation fields.",
  "Trim and density correction sections, where applicable.",
  "Forward, aft and midship draft entry sections.",
  "Mean draft and corrected mean draft calculation fields.",
  "Final displacement and cargo quantity calculation sections.",
  "Clear and practical layout for onboard use.",
  "Digital form suitable for computer or tablet use.",
  "Basic instructions for completing the form.",
];

export const DRAFTFORM_SECTIONS: QuotationSection[] = [
  {
    title: "Deliverables",
    lines: [
      "The USD 300.00 fee includes:",
      "One vessel-specific draft survey form.",
      "Online consultation with the Chief Officer.",
      "Incorporation of vessel particulars and data supplied by the client.",
      "Calculation structure and formulas, where applicable.",
      "One round of reasonable corrections following review.",
      "Final electronic copy in an agreed format.",
    ],
  },
  {
    title: "Information Required",
    lines: [
      "The Chief Officer will be requested to provide the relevant vessel information, which may include:",
      "Vessel particulars.",
      "Hydrostatic tables / curves.",
      "Deadweight information.",
      "Draft marks and locations.",
      "Tank capacities and relevant tank data.",
      "Lightship / constant information, where applicable.",
      "Fresh water and seawater density information.",
      "Any existing draft survey forms or calculations used onboard.",
    ],
  },
];

export const DRAFTFORM_CONDITIONS = [
  "1. The service is provided on an online / remote basis.",
  "2. The USD 300.00 fee applies to one vessel-specific draft survey form.",
  "3. The accuracy of the completed form depends on the accuracy and completeness of the vessel data supplied by the client.",
  "4. The service does not include an onboard draft survey or physical verification of vessel particulars.",
  "5. Hydrostatic data, tank data and other vessel-specific information must be provided by the client or obtained from authorised vessel documentation.",
  "6. The completed form is intended as a practical operational tool and does not replace the Company's approved procedures or any statutory, Class or cargo survey requirements.",
  "7. Any substantial redesign, additional calculation requirements or additional vessel forms will be subject to a separate quotation.",
].join("\n");

export const DRAFTFORM_PAYMENT_TERMS = "Payment in advance before commencement of the development work.";

// ── On-Hire / Off-Hire Condition Survey ────────────────────────────────────
export const ONHIRE_ITEMS: QuotationItemDefault[] = [
  { description: "On-Hire Survey – Port", quantity: 1, unitPrice: 600 },
  { description: "Off-Hire Survey – Port", quantity: 0, unitPrice: 600 },
  { description: "On-Hire / Off-Hire Survey – Anchorage", quantity: 0, unitPrice: 750 },
  { description: "On-Hire / Off-Hire Survey – Shipyard", quantity: 0, unitPrice: 600 },
  { description: "Additional attendance / re-attendance", quantity: 0, unitPrice: 350 },
  { description: "Waiting time exceeding 2 hours (per hour)", quantity: 0, unitPrice: 60 },
  { description: "Night / weekend / public holiday attendance (per hour)", quantity: 0, unitPrice: 100 },
  { description: "Launch / boat transfer to anchorage (at cost)", quantity: 0, unitPrice: 0 },
  { description: "Transportation / port access / special permits (at cost)", quantity: 0, unitPrice: 0 },
];

export const ONHIRE_SCOPE = [
  "The On-Hire / Off-Hire survey will generally cover:",
  "General condition and appearance of the vessel.",
  "Hull and external areas, as accessible.",
  "Main deck and weather decks.",
  "Accommodation and common areas.",
  "Navigation bridge and equipment, visually inspected.",
  "Engine room and machinery spaces, where accessible.",
  "Cargo holds / tanks, where applicable and safely accessible.",
  "Deck machinery and equipment.",
  "Mooring equipment, anchors and anchoring arrangements.",
  "Cargo handling equipment, where fitted.",
  "Lifesaving and firefighting equipment, visually inspected.",
  "General cleanliness and housekeeping condition.",
  "Evidence of damage, corrosion, leakage or deterioration.",
  "Recording of existing damage and defects.",
  "Comparison of condition at the relevant handover or redelivery stage.",
  "Photographic documentation of significant findings.",
  "Review of relevant vessel records made available.",
];

export const ONHIRE_REPORTING = [
  "Attendance by a qualified marine surveyor.",
  "Visual condition assessment of accessible areas.",
  "Recording of apparent defects, damages and deficiencies.",
  "Photographs of relevant findings.",
  "Preparation of an On-Hire / Off-Hire Condition Survey Report.",
  "Clear identification of significant condition differences, where applicable.",
  "Submission of the report in PDF format by email.",
];

export const ONHIRE_CONDITIONS = [
  "1. The above rates are based on one vessel attendance and an inspection duration of up to 6 hours.",
  "2. The survey is limited to areas that are safely accessible at the time of attendance.",
  "3. No dismantling, opening-up, testing, thickness measurement or specialist examination is included unless specifically agreed.",
  "4. Waiting time exceeding 2 hours due to vessel, terminal, port or operational delays will be charged at USD 60.00/hour.",
  "5. Night attendance, weekends and public holidays will attract additional charges.",
  "6. Launch/boat hire, transportation, port passes, permits and other third-party expenses will be charged at cost.",
  "7. Additional attendance or re-inspection will be charged separately.",
  "8. The survey is a visual condition assessment and does not constitute a Class, statutory, machinery performance, valuation or structural survey unless specifically agreed.",
  "9. The survey report records the condition observed at the time and place of attendance and is not intended to determine latent defects or defects not reasonably accessible during the survey.",
  "10. Any additional requirements outside the stated scope will be subject to a separate quotation.",
].join("\n");

// ── On-Hire / Off-Hire Bunker Survey ───────────────────────────────────────
export const ONHIREBUNKER_ITEMS: QuotationItemDefault[] = [
  { description: "On-Hire Bunker Survey – Port", quantity: 1, unitPrice: 500 },
  { description: "Off-Hire Bunker Survey – Port", quantity: 0, unitPrice: 500 },
  { description: "On-Hire / Off-Hire Bunker Survey – Anchorage", quantity: 0, unitPrice: 650 },
  { description: "On-Hire / Off-Hire Bunker Survey – Shipyard", quantity: 0, unitPrice: 500 },
  { description: "Additional attendance / re-attendance", quantity: 0, unitPrice: 300 },
  { description: "Waiting time exceeding 2 hours (per hour)", quantity: 0, unitPrice: 50 },
  { description: "Night / weekend / public holiday attendance (per hour)", quantity: 0, unitPrice: 75 },
  { description: "Launch / boat transfer to anchorage (at cost)", quantity: 0, unitPrice: 0 },
  { description: "Transportation / port access / special permits (at cost)", quantity: 0, unitPrice: 0 },
];

export const ONHIREBUNKER_SCOPE = [
  "The On-Hire / Off-Hire Bunker Survey will generally cover:",
  "Attendance onboard the vessel at the agreed location.",
  "Recording of bunker quantities onboard at the time of attendance.",
  "Measurement of accessible fuel oil and diesel oil tanks.",
  "Verification of tank sounding / ullage measurements.",
  "Review of relevant tank calibration tables.",
  "Review of vessel's bunker records and available documentation.",
  "Recording of fuel types and quantities.",
  "Calculation of apparent bunker ROB (Remaining on Board).",
  "Recording of fresh water ROB, where specifically requested.",
  "Comparison with vessel records, where applicable.",
  "Identification of significant discrepancies or unusual findings.",
  "Photographic documentation, where appropriate.",
];

export const ONHIREBUNKER_SECTIONS: QuotationSection[] = [
  {
    title: "Bunker Measurement",
    lines: [
      "Where applicable, the surveyor will use vessel-provided:",
      "Sounding tapes / ullage equipment.",
      "Tank calibration tables.",
      "Temperature readings.",
      "Density information.",
      "Bunker delivery documentation.",
      "Relevant vessel records.",
      "The final quantity calculation will be based on the information and measurements available at the time of attendance.",
    ],
  },
  {
    title: "Reporting",
    lines: [
      "The survey fee includes:",
      "Attendance by a qualified marine surveyor.",
      "Tank measurement and bunker quantity assessment, where safely accessible.",
      "Recording of bunker ROB.",
      "Relevant calculation and reconciliation.",
      "Photographs, where applicable.",
      "Preparation of an On-Hire / Off-Hire Bunker Survey Report.",
      "Submission of the report in PDF format by email.",
    ],
  },
];

export const ONHIREBUNKER_CONDITIONS = [
  "1. The above rates are based on one vessel attendance and up to 6 hours.",
  "2. The survey is limited to tanks that are safely accessible and suitable for measurement.",
  "3. Vessel's tank calibration tables and relevant vessel data must be made available for calculation.",
  "4. The survey does not include laboratory fuel quality testing, sampling analysis or chemical analysis unless specifically agreed.",
  "5. Waiting time exceeding 2 hours due to vessel, terminal, bunker supplier or operational delays will be charged at USD 50.00/hour.",
  "6. Night attendance, weekends and public holidays will attract additional charges.",
  "7. Launch/boat hire, transportation, port passes, permits and other third-party expenses will be charged at cost.",
  "8. Additional attendance or re-measurement will be charged separately.",
  "9. The survey records the apparent bunker quantities based on measurements and information available at the time of attendance. It does not constitute a guarantee of the accuracy of vessel tank calibration tables or other vessel-supplied data.",
  "10. Any requirements for independent bunker sampling, laboratory analysis, quantity dispute investigation or fuel quality assessment will be subject to a separate quotation.",
].join("\n");

export const DEFAULT_CONDITIONS =
  "Rates are based on one vessel attendance and one completed bunker survey during normal working hours. " +
  "Waiting time exceeding 2 hours, night attendance, weekends and public holidays are charged at the applicable extra rates. " +
  "Launch/boat charges, transportation, port passes and other third-party expenses, if required, are charged at cost. " +
  "Survey quantities are determined from vessel tank measurements, calibration tables and information available at attendance.";

export const DEFAULT_TERMS = "Within 30 days from invoice date, unless otherwise agreed.";
