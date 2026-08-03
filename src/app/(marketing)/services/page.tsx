import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { Section } from "@/components/marketing/section";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Marine consultancy, survey, inspection, compliance, navigation, training, remote support, incident, and port services from DMD Marine.",
};

export default async function ServicesPage() {
  const categories = await db.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: { services: { where: { isActive: true }, orderBy: { order: "asc" } } },
  });

  return (
    <>
      <Section containerClassName="max-w-3xl text-center">
        <span className="text-xs font-semibold tracking-wide text-accent uppercase">
          What We Do
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Our Services
        </h1>
        <p className="mt-4 text-muted-foreground">
          A full range of marine consultancy, survey, compliance, and support
          services — delivered to international standards.
        </p>
      </Section>

      {categories.map((category, index) => (
        <Section
          key={category.id}
          id={category.slug}
          className={index % 2 === 1 ? "bg-secondary/30" : undefined}
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {category.name}
          </h2>
          {category.description && (
            <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
          )}

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.services.map((service) => (
              <Link key={service.id} href={`/services/${service.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
