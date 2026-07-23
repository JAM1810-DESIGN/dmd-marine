import { Section } from "@/components/marketing/section";

export function CompanyIntroduction() {
  return (
    <Section containerClassName="grid gap-10 md:grid-cols-2 md:items-center">
      <div>
        <span className="text-xs font-semibold tracking-wide text-gold uppercase">
          Who We Are
        </span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
          Independent marine expertise, on your side
        </h2>
        <p className="mt-4 text-muted-foreground">
          DMD Marine Consultation &amp; Services supports vessel owners, operators,
          charterers, and maritime professionals with independent consultancy,
          survey, and inspection expertise. We work to international standards and
          give our clients clear, defensible findings they can act on with
          confidence.
        </p>
        <p className="mt-4 text-muted-foreground">
          From cargo assurance and compliance consulting to deck officer mentoring
          and remote marine support, our services are built around one goal:
          protecting your vessel, your cargo, and your operation.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Independent", detail: "No conflicts of interest" },
          { label: "International Standards", detail: "IMO / ISM / ISPS aligned" },
          { label: "Responsive", detail: "Remote & on-site support" },
          { label: "Experienced Consultants", detail: "Career maritime professionals" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-secondary/60 p-5">
            <p className="font-heading text-sm font-semibold text-navy">{item.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
