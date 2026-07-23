import { Section, SectionHeading } from "@/components/marketing/section";

const INDUSTRIES = [
  "Shipping Lines",
  "Charterers",
  "Vessel Owners & Managers",
  "P&I Clubs & Insurers",
  "Port Authorities",
  "Offshore & Energy Operators",
  "Cargo Interests",
  "Maritime Training Institutions",
];

export function IndustriesServed() {
  return (
    <Section className="bg-navy text-white">
      <SectionHeading eyebrow="Who We Serve" title="Industries Served" invert />

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {INDUSTRIES.map((industry) => (
          <span
            key={industry}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/90"
          >
            {industry}
          </span>
        ))}
      </div>
    </Section>
  );
}
