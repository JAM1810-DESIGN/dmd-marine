import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Section } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How DMD Marine Consultation & Services collects, uses, and protects your information, including data received through Facebook and Messenger.",
};

const UPDATED = "13 August 2026";
const CONTACT_EMAIL = "dmdmarine2010@gmail.com";

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 font-heading text-lg font-semibold text-foreground">{children}</h2>;
}

function Text({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-muted-foreground">{children}</p>;
}

export default function PrivacyPolicyPage() {
  return (
    <Section containerClassName="max-w-3xl">
      <span className="text-xs font-semibold tracking-wide text-accent uppercase">Legal</span>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <Text>
        DMD Marine Consultation &amp; Services (&quot;DMD Marine&quot;, &quot;we&quot;,
        &quot;us&quot;) respects your privacy. This policy explains what information we collect, how
        we use it, and the choices you have. It applies to our website, our services, and messages
        or inquiries you send us through Facebook and Messenger.
      </Text>

      <Heading>Information we collect</Heading>
      <Text>
        We collect information you provide directly — such as your name, email address, phone
        number, company or vessel details, and the contents of your inquiries — when you contact us,
        request a consultation, or message our Facebook Page. When you interact with us through
        Facebook or Messenger, we receive the information Facebook makes available for that
        conversation, such as your public profile name and the messages you send.
      </Text>

      <Heading>How we use your information</Heading>
      <Text>
        We use your information to respond to your inquiries, provide and manage our marine
        consultancy and survey services, prepare quotations and reports, communicate with you about
        your requests, and keep records required to run our business. We do not sell your personal
        information.
      </Text>

      <Heading>Facebook and Messenger data</Heading>
      <Text>
        When you message our Facebook Page, your messages are delivered to our internal management
        system so our team can read and reply to them. We use this data only to communicate with you
        and handle your request. Our use of information received from Facebook follows Facebook&apos;s
        Platform Terms and Developer Policies.
      </Text>

      <Heading>Sharing of information</Heading>
      <Text>
        We share information only as needed to provide our services (for example, with team members
        handling your request) or where required by law. We do not sell or rent your personal
        information to third parties.
      </Text>

      <Heading>Data retention</Heading>
      <Text>
        We keep your information for as long as necessary to provide our services and meet legal,
        accounting, or reporting requirements, after which it is deleted or anonymized.
      </Text>

      <Heading>Data deletion</Heading>
      <Text>
        You may request that we delete the personal information we hold about you, including data
        received through Facebook or Messenger. Email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline">
          {CONTACT_EMAIL}
        </a>{" "}
        with the subject &quot;Data Deletion Request&quot; and we will remove your information from
        our systems, subject to any records we are legally required to retain.
      </Text>

      <Heading>Security</Heading>
      <Text>
        We take reasonable technical and organizational measures to protect your information against
        unauthorized access, loss, or misuse. No method of transmission or storage is completely
        secure, but we work to safeguard your data.
      </Text>

      <Heading>Your choices</Heading>
      <Text>
        You may contact us at any time to access, correct, or delete your personal information, or to
        ask how it is used. You can also stop messaging our Facebook Page at any time.
      </Text>

      <Heading>Changes to this policy</Heading>
      <Text>
        We may update this policy from time to time. The &quot;Last updated&quot; date above shows
        when it was last revised.
      </Text>

      <Heading>Contact us</Heading>
      <Text>
        For any privacy question or request, contact DMD Marine Consultation &amp; Services at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline">
          {CONTACT_EMAIL}
        </a>
        .
      </Text>
    </Section>
  );
}
