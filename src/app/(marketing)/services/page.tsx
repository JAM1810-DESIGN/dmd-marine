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
    include: {
      services: {
        where: { isActive: true, parentServiceId: null },
        orderBy: { order: "asc" },
        include: {
          children: { where: { isActive: true }, orderBy: { order: "asc" } },
        },
      },
    },
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
            {category.services.map((service) => {
              const prices = [service.basePrice, ...service.children.map((child) => child.basePrice)]
                .filter((price): price is NonNullable<typeof price> => price != null)
                .map((price) => Number(price));
              const fromPrice = prices.length > 0 ? Math.min(...prices) : null;

              return (
              <Card key={service.id} className="h-full transition-shadow hover:shadow-md">
                <Link href={`/services/${service.slug}`}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{service.name}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {fromPrice != null
                          ? `From ${fromPrice.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 })}`
                          : "On request"}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </CardHeader>
                </Link>
                {service.children.length > 0 && (
                  <ul className="flex flex-col gap-1 px-6 pb-4">
                    {service.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/services/${child.slug}`}
                          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              );
            })}
          </div>
        </Section>
      ))}
    </>
  );
}
