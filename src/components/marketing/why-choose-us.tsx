import { ShieldCheck, Globe, Clock, Users, FileCheck, Radio } from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";

const REASONS = [
  {
    icon: ShieldCheck,
    title: "Independent & Unbiased",
    description: "No affiliation with shipowners, charterers, or underwriters — findings you can trust.",
  },
  {
    icon: Globe,
    title: "International Standards",
    description: "Work aligned with IMO, ISM, and ISPS frameworks across every engagement.",
  },
  {
    icon: Clock,
    title: "Responsive Support",
    description: "Remote consultation and rapid on-site response when timing matters.",
  },
  {
    icon: Users,
    title: "Experienced Consultants",
    description: "Career maritime professionals with hands-on operational experience.",
  },
  {
    icon: FileCheck,
    title: "Clear, Defensible Reports",
    description: "Findings documented to withstand scrutiny from clients, insurers, and regulators.",
  },
  {
    icon: Radio,
    title: "Remote Marine Support",
    description: "Expert advisory and document review available without a physical attendance.",
  },
];

export function WhyChooseUs() {
  return (
    <Section>
      <SectionHeading eyebrow="Why DMD Marine" title="Why Choose Us" />

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {REASONS.map((reason) => (
          <div key={reason.title} className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
              <reason.icon className="size-5" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-semibold text-navy">{reason.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{reason.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
