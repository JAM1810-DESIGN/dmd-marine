import { Hero } from "@/components/shared/hero";
import { CompanyIntroduction } from "@/components/marketing/company-introduction";
import { ServicesOverview } from "@/components/marketing/services-overview";
import { WhyChooseUs } from "@/components/marketing/why-choose-us";
import { IndustriesServed } from "@/components/marketing/industries-served";
import { ProjectsPreview } from "@/components/marketing/projects-preview";
import { TestimonialsPreview } from "@/components/marketing/testimonials-preview";
import { ContactCta } from "@/components/marketing/contact-cta";

export default function Home() {
  return (
    <>
      <Hero />
      <CompanyIntroduction />
      <ServicesOverview />
      <WhyChooseUs />
      <IndustriesServed />
      <ProjectsPreview />
      <TestimonialsPreview />
      <ContactCta />
    </>
  );
}
