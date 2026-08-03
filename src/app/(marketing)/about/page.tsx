import type { Metadata } from "next";
import { Target, Eye, ShieldCheck, Scale, Users, Compass } from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about DMD Marine Consultation & Services — our mission, vision, values, and the experience behind our marine consultancy.",
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Integrity",
    description: "We report what we find, not what's convenient. Our independence is non-negotiable.",
  },
  {
    icon: Scale,
    title: "Objectivity",
    description: "Every assessment is grounded in evidence and measured against recognized standards.",
  },
  {
    icon: Users,
    title: "Professionalism",
    description: "Career maritime professionals who treat every engagement with the seriousness it deserves.",
  },
  {
    icon: Compass,
    title: "Reliability",
    description: "Clear communication and dependable turnaround, from first contact to final report.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Section containerClassName="max-w-3xl text-center">
        <span className="text-xs font-semibold tracking-wide text-accent uppercase">
          About Us
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Independent marine expertise, built on standards
        </h1>
        <p className="mt-4 text-muted-foreground">
          DMD Marine Consultation &amp; Services was formed to give vessel owners,
          operators, and maritime professionals an independent partner for
          consultancy, survey, inspection, compliance, and professional
          development — without the conflicts of interest that come from
          representing a single side of an engagement.
        </p>
      </Section>

      <Section className="bg-secondary/30" containerClassName="grid gap-10 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-2">
            <Target className="size-8 text-primary" />
            <h2 className="font-heading text-xl font-semibold text-foreground">Our Mission</h2>
            <p className="text-sm text-muted-foreground">
              To provide independent, standards-aligned marine consultancy and
              survey services that protect our clients&apos; vessels, cargo, and
              operations — and to support the professional growth of the deck
              officers and maritime professionals we work alongside.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-2">
            <Eye className="size-8 text-primary" />
            <h2 className="font-heading text-xl font-semibold text-foreground">Our Vision</h2>
            <p className="text-sm text-muted-foreground">
              To be a trusted, independent name in marine consultancy — known for
              rigorous, defensible findings and for raising the standard of
              maritime professional development across the industry.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section>
        <SectionHeading eyebrow="What We Stand For" title="Our Values" />
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value) => (
            <div key={value.title} className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-sidebar text-sidebar-foreground">
                <value.icon className="size-6" />
              </div>
              <h3 className="mt-4 font-heading text-sm font-semibold text-foreground">
                {value.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-sidebar text-sidebar-foreground" containerClassName="max-w-3xl text-center">
        <span className="text-xs font-semibold tracking-wide text-accent uppercase">
          Our Experience
        </span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Broad coverage, hands-on expertise
        </h2>
        <p className="mt-4 text-white/70">
          Our consultants draw on hands-on maritime operational backgrounds
          across vessel operations, cargo surveying, compliance auditing, and
          bridge team management — spanning consultancy, survey &amp;
          inspection, compliance, navigation, training, remote support,
          incident investigation, and port operations.
        </p>
      </Section>
    </>
  );
}
