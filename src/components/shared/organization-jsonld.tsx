import { getSiteSettings } from "@/lib/site-settings";
import { env } from "@/lib/env";

export async function OrganizationJsonLd() {
  const settings = await getSiteSettings();

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.companyName,
    url: env.NEXT_PUBLIC_APP_URL,
    description:
      "Independent Marine Expertise for Vessel Operations, Cargo Assurance, Compliance, and Maritime Professional Development.",
  };

  if (settings.email) jsonLd.email = settings.email;
  if (settings.phone) jsonLd.telephone = settings.phone;
  if (settings.address) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      addressLocality: settings.city ?? undefined,
      addressCountry: settings.country ?? undefined,
    };
  }
  const sameAs = [settings.facebookUrl, settings.linkedinUrl, settings.instagramUrl].filter(
    (url): url is string => Boolean(url),
  );
  if (sameAs.length > 0) jsonLd.sameAs = sameAs;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
