import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export async function ServicesOverview() {
  const categories = await db.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { services: { where: { isActive: true, parentServiceId: null } } } },
    },
  });

  if (categories.length === 0) return null;

  return (
    <Section className="bg-secondary/30">
      <SectionHeading
        eyebrow="What We Do"
        title="Our Services"
        description="A full range of marine consultancy, survey, compliance, and support services."
      />

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <Link key={category.id} href={`/services#${category.slug}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base">{category.name}</CardTitle>
                <CardDescription>
                  {category._count.services} service
                  {category._count.services === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
        >
          View all services
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </Section>
  );
}
