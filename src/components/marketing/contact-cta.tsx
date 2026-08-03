import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/section";

export function ContactCta() {
  return (
    <Section containerClassName="flex flex-col items-center gap-6 rounded-2xl bg-sidebar px-6 py-12 text-center text-sidebar-foreground sm:px-12">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Ready to talk to a marine consultant?
      </h2>
      <p className="max-w-xl text-white/70">
        Book a consultation or send us your requirements — we&apos;ll respond with
        next steps promptly.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/book-consultation">Book Consultation</Link>}
        />
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          className="border-white/30 bg-transparent text-white hover:bg-white/10"
          render={<Link href="/contact">Request Quote</Link>}
        />
      </div>
    </Section>
  );
}
