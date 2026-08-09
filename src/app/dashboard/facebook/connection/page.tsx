import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { env } from "@/lib/env";
import { isFacebookConfigured, facebookConfigStatus } from "@/lib/facebook";
import { ConnectionBanner } from "../connection-banner";

export const metadata: Metadata = { title: "Facebook Connection" };

const CHECKS: { key: keyof typeof facebookConfigStatus; label: string; env: string }[] = [
  { key: "appSecret", label: "App secret", env: "FACEBOOK_APP_SECRET" },
  { key: "pageAccessToken", label: "Page access token", env: "FACEBOOK_PAGE_ACCESS_TOKEN" },
  { key: "webhookVerifyToken", label: "Webhook verify token", env: "FACEBOOK_WEBHOOK_VERIFY_TOKEN" },
];

export default function FacebookConnectionPage() {
  const pageName = env.NEXT_PUBLIC_APP_NAME;
  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/facebook/webhook`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Connection</h1>
        <p className="text-sm text-muted-foreground">
          Connect {pageName}&rsquo;s Facebook Page to sync messages, comments, reviews, and requests.
        </p>
      </div>

      <ConnectionBanner configured={isFacebookConfigured} pageName={pageName} />

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-base font-semibold">Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Set these environment variables on the server (values are never shown here).
        </p>
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {CHECKS.map((check) => {
            const present = facebookConfigStatus[check.key];
            return (
              <li key={check.key} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{check.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">{check.env}</p>
                </div>
                {present ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-success">
                    <CheckCircle2 className="size-4" />
                    Set
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <XCircle className="size-4" />
                    Missing
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-base font-semibold">Webhook callback</h2>
        <p className="text-sm text-muted-foreground">
          Register this URL in the Meta App dashboard (Messenger &amp; Page subscriptions), using your
          verify token:
        </p>
        <code className="mt-2 block overflow-x-auto rounded-md bg-secondary/60 px-3 py-2 font-mono text-xs text-foreground">
          {webhookUrl}
        </code>
      </div>
    </div>
  );
}
