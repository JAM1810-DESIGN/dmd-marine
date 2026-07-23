import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { OrganizationJsonLd } from "@/components/shared/organization-jsonld";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <OrganizationJsonLd />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
