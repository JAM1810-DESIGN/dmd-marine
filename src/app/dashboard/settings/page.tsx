import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
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
    </div>
  );
}
