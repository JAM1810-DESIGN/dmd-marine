import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Section } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing use of the DMD Marine Consultation & Services website and services.",
};

const UPDATED = "13 August 2026";
const CONTACT_EMAIL = "dmdmarine2010@gmail.com";

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 font-heading text-lg font-semibold text-foreground">{children}</h2>;
}

function Text({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-muted-foreground">{children}</p>;
}

export default function TermsOfServicePage() {
  return (
    <Section containerClassName="max-w-3xl">
      <span className="text-xs font-semibold tracking-wide text-accent uppercase">Legal</span>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <Text>
        These Terms of Service (&quot;Terms&quot;) govern your use of the website and services of DMD
        Marine Consultation &amp; Services (&quot;DMD Marine&quot;, &quot;we&quot;, &quot;us&quot;).
        By using our website, contacting us, or messaging our Facebook Page, you agree to these Terms.
      </Text>

      <Heading>Our services</Heading>
      <Text>
        DMD Marine provides marine consultancy, survey, inspection, mentoring, and related
        professional services. Information on our website is provided for general guidance and does
        not constitute a binding offer. Specific engagements are subject to a separate quotation and
        agreement.
      </Text>

      <Heading>Use of the website</Heading>
      <Text>
        You agree to use our website and communication channels lawfully and not to misuse them,
        attempt to disrupt them, or submit false or harmful content. We may update, suspend, or
        withdraw parts of the website at any time.
      </Text>

      <Heading>Inquiries and messages</Heading>
      <Text>
        When you contact us through our website, email, or Facebook Page, you are responsible for the
        accuracy of the information you provide. We use your information to respond to and manage your
        request, as described in our{" "}
        <a href="/privacy" className="text-foreground underline">
          Privacy Policy
        </a>
        .
      </Text>

      <Heading>Quotations and engagements</Heading>
      <Text>
        Any quotation we issue is valid for the period stated in it and is subject to the commercial
        conditions set out in that quotation. Services are performed based on the agreed scope, safe
        and reasonable access, and information made available to us at the time of attendance.
      </Text>

      <Heading>No warranty</Heading>
      <Text>
        Our website content is provided &quot;as is&quot; without warranties of any kind. While we
        strive for accuracy, we do not guarantee that all information is current or error-free.
        Professional findings are based on the conditions observed and information available at the
        time of the relevant service.
      </Text>

      <Heading>Limitation of liability</Heading>
      <Text>
        To the extent permitted by law, DMD Marine is not liable for any indirect or consequential
        loss arising from use of our website. Liability for our professional services is governed by
        the terms of the specific engagement agreed with the client.
      </Text>

      <Heading>Changes to these Terms</Heading>
      <Text>
        We may update these Terms from time to time. The &quot;Last updated&quot; date above shows
        when they were last revised. Continued use of our website after changes means you accept the
        updated Terms.
      </Text>

      <Heading>Contact us</Heading>
      <Text>
        For any question about these Terms, contact DMD Marine Consultation &amp; Services at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline">
          {CONTACT_EMAIL}
        </a>
        .
      </Text>
    </Section>
  );
}
