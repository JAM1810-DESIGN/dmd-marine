import Link from "next/link";
import { Anchor, Mail, Phone, MapPin } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export async function Footer() {
  const settings = await getSiteSettings();
  const hasContactDetails = settings.email || settings.phone || settings.address;
  const hasSocial = settings.facebookUrl || settings.linkedinUrl || settings.instagramUrl;

  return (
    <footer className="border-t border-navy/10 bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-navy">
            <Anchor className="size-6 text-gold" aria-hidden />
            <span className="font-heading text-base font-semibold tracking-tight">
              {settings.companyName}
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Independent Marine Expertise for Vessel Operations, Cargo Assurance,
            Compliance, and Maritime Professional Development.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-navy">Navigate</h3>
          <ul className="mt-3 space-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-navy"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-navy">Contact</h3>
          {hasContactDetails ? (
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {settings.email && (
                <li className="flex items-center gap-2">
                  <Mail className="size-4 shrink-0" />
                  <a href={`mailto:${settings.email}`} className="hover:text-navy">
                    {settings.email}
                  </a>
                </li>
              )}
              {settings.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0" />
                  <a href={`tel:${settings.phone}`} className="hover:text-navy">
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings.address && (
                <li className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" />
                  <span>{settings.address}</span>
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              <Link href="/contact" className="underline underline-offset-4 hover:text-navy">
                Get in touch
              </Link>
            </p>
          )}
          {hasSocial && (
            <div className="mt-4 flex items-center gap-4 text-sm">
              {settings.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground underline underline-offset-4 hover:text-navy"
                >
                  Facebook
                </a>
              )}
              {settings.linkedinUrl && (
                <a
                  href={settings.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground underline underline-offset-4 hover:text-navy"
                >
                  LinkedIn
                </a>
              )}
              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground underline underline-offset-4 hover:text-navy"
                >
                  Instagram
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-navy/10 py-6 text-center text-xs text-navy/50">
        {`© ${new Date().getFullYear()} ${settings.companyName}`}
      </div>
    </footer>
  );
}
