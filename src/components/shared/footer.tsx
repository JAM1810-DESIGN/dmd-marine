import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { LogoMark } from "@/components/shared/logo-mark";
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
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-foreground">
            <LogoMark className="size-6 text-primary" aria-hidden />
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
          <h3 className="text-sm font-semibold text-foreground">Navigate</h3>
          <ul className="mt-3 space-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Contact</h3>
          {hasContactDetails ? (
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {settings.email && (
                <li className="flex items-center gap-2">
                  <Mail className="size-4 shrink-0" />
                  <a href={`mailto:${settings.email}`} className="hover:text-foreground">
                    {settings.email}
                  </a>
                </li>
              )}
              {settings.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0" />
                  <a href={`tel:${settings.phone}`} className="hover:text-foreground">
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
              <Link href="/contact" className="underline underline-offset-4 hover:text-foreground">
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
      </div>

      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        {`© ${new Date().getFullYear()} ${settings.companyName}`}
      </div>
    </footer>
  );
}
