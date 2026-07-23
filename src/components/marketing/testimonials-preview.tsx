import { db } from "@/lib/db";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Card, CardContent } from "@/components/ui/card";

export async function TestimonialsPreview() {
  const testimonials = await db.testimonial.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    take: 3,
  });

  if (testimonials.length === 0) return null;

  return (
    <Section className="bg-secondary/30">
      <SectionHeading eyebrow="Client Feedback" title="What Clients Say" />

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id}>
            <CardContent className="pt-2">
              <p className="text-sm text-muted-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
              <p className="mt-4 text-sm font-semibold text-navy">{testimonial.authorName}</p>
              {(testimonial.authorTitle || testimonial.company) && (
                <p className="text-xs text-muted-foreground">
                  {[testimonial.authorTitle, testimonial.company].filter(Boolean).join(", ")}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}
