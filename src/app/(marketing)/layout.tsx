import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { OrganizationJsonLd } from "@/components/shared/organization-jsonld";
import { AnimatedSky } from "@/components/shared/animated-sky";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <AnimatedSky variant="full" />
      <OrganizationJsonLd />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
