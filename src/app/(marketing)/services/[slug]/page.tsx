import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isFaqArray } from "@/lib/faq";
import { Section } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

async function getService(slug: string) {
  return db.service.findUnique({
    where: { slug, isActive: true },
    include: { category: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return {};

  return {
    title: service.name,
    description: service.overview ?? `${service.name} — ${service.category.name} from DMD Marine.`,
  };
}

export async function generateStaticParams() {
  const services = await db.service.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return services.map((service) => ({ slug: service.slug }));
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();

  const faq = isFaqArray(service.faq) ? service.faq : [];
  const hasContent = service.overview || service.benefits || service.scope || service.process;

  return (
    <>
      <Section containerClassName="max-w-3xl">
        <Link
          href={`/services#${service.category.slug}`}
          className="text-xs font-semibold tracking-wide text-accent uppercase"
        >
          {service.category.name}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {service.name}
        </h1>

        {hasContent ? (
          <div className="mt-8 space-y-8">
            {service.overview && (
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Overview</h2>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">
                  {service.overview}
                </p>
              </div>
            )}
            {service.benefits && (
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Benefits</h2>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">
                  {service.benefits}
                </p>
              </div>
            )}
            {service.scope && (
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Scope</h2>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">{service.scope}</p>
              </div>
            )}
            {service.process && (
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Process</h2>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">
                  {service.process}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-8 text-muted-foreground">
            Detailed information for this service is being finalized. Contact us
            for a full overview of scope, process, and pricing.
          </p>
        )}

        {faq.length > 0 && (
          <div className="mt-10">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Frequently Asked Questions
            </h2>
            <Accordion className="mt-4">
              {faq.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        <div className="mt-10">
          <Button
            size="lg"
            nativeButton={false}
            render={
              <Link href={`/book-consultation?service=${service.slug}`}>
                Request This Service
              </Link>
            }
          />
        </div>
      </Section>
    </>
  );
}
