import type { Metadata } from "next";
import { db } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage";
import { Section } from "@/components/marketing/section";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: "Book Consultation",
  description: "Request a marine consultation, survey, or inspection from DMD Marine.",
};

export default async function BookConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service: serviceSlug } = await searchParams;

  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    include: { category: true },
  });

  const topLevel = services.filter((service) => !service.parentServiceId);
  const orderedServices = topLevel.flatMap((parent) => [
    parent,
    ...services.filter((service) => service.parentServiceId === parent.id),
  ]);

  const defaultService = serviceSlug
    ? services.find((service) => service.slug === serviceSlug)
    : undefined;

  return (
    <Section containerClassName="max-w-2xl">
      <span className="text-xs font-semibold tracking-wide text-accent uppercase">
        Book Consultation
      </span>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Request a Consultation
      </h1>
      <p className="mt-4 text-muted-foreground">
        Tell us about your vessel and requirements — we&apos;ll follow up to
        confirm scheduling and next steps.
      </p>

      <div className="mt-10">
        <BookingForm
          services={orderedServices.map((service) => ({
            id: service.id,
            name: service.name,
            categoryName: service.category.name,
            parentServiceId: service.parentServiceId,
          }))}
          defaultServiceId={defaultService?.id}
          attachmentsEnabled={isStorageConfigured}
        />
      </div>
    </Section>
  );
}
