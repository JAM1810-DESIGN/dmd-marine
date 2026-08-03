import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";
import { Section } from "@/components/marketing/section";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with DMD Marine Consultation & Services.",
};

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const hasContactDetails = settings.email || settings.phone || settings.address;
  const hasSocial = settings.facebookUrl || settings.linkedinUrl || settings.instagramUrl;

  return (
    <Section containerClassName="grid gap-12 md:grid-cols-2">
      <div>
        <span className="text-xs font-semibold tracking-wide text-accent uppercase">
          Get In Touch
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-4 text-muted-foreground">
          Have a question or need a quote? Send us a message and a consultant
          will get back to you.
        </p>

        {hasContactDetails && (
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {settings.email && (
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-primary" />
                <a href={`mailto:${settings.email}`} className="hover:text-foreground">
                  {settings.email}
                </a>
              </li>
            )}
            {settings.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-primary" />
                <a href={`tel:${settings.phone}`} className="hover:text-foreground">
                  {settings.phone}
                </a>
              </li>
            )}
            {settings.address && (
              <li className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-primary" />
                <span>{settings.address}</span>
              </li>
            )}
          </ul>
        )}

        {hasSocial && (
          <div className="mt-6 flex items-center gap-4 text-sm">
            {settings.facebookUrl && (
              <a
                href={settings.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Facebook
              </a>
            )}
            {settings.linkedinUrl && (
              <a
                href={settings.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                LinkedIn
              </a>
            )}
            {settings.instagramUrl && (
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Instagram
              </a>
            )}
          </div>
        )}
      </div>

      <ContactForm />
    </Section>
  );
}
