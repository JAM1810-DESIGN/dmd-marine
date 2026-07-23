import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { isFacebookConfigured, facebookConfigStatus } from "@/lib/facebook";
import { isStorageConfigured } from "@/lib/storage";
import { env } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { UsersTable } from "./users-table";
import { SiteSettingsForm } from "./site-settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();

  if (session?.user.role !== "ADMIN") {
    return (
      <div className="rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <p className="text-sm text-muted-foreground">
          Only administrators can view account and site settings.
        </p>
      </div>
    );
  }

  const [users, settings] = await Promise.all([
    db.user.findMany({ orderBy: { name: "asc" } }),
    getSiteSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage staff accounts and site-wide settings.</p>
      </div>

      <UsersTable
        currentUserId={session.user.id}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        }))}
      />

      <SiteSettingsForm settings={settings} />

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-base font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Credentials live in environment variables, not here — this is a read-only status check.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Facebook (Messenger &amp; Lead Ads)</p>
              {isFacebookConfigured ? (
                <p className="text-xs text-muted-foreground">
                  Webhook URL: {env.NEXT_PUBLIC_APP_URL}/api/facebook/webhook
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Missing:{" "}
                  {[
                    !facebookConfigStatus.appSecret && "FACEBOOK_APP_SECRET",
                    !facebookConfigStatus.pageAccessToken && "FACEBOOK_PAGE_ACCESS_TOKEN",
                    !facebookConfigStatus.webhookVerifyToken && "FACEBOOK_WEBHOOK_VERIFY_TOKEN",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
            <Badge variant={isFacebookConfigured ? "default" : "outline"}>
              {isFacebookConfigured ? "Connected" : "Not connected"}
            </Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Cloudinary (file storage)</p>
              <p className="text-xs text-muted-foreground">
                Used for booking attachments and project documents.
              </p>
            </div>
            <Badge variant={isStorageConfigured ? "default" : "outline"}>
              {isStorageConfigured ? "Connected" : "Not connected"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
