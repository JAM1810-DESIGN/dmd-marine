import type { Metadata } from "next";
import { db } from "@/lib/db";
import { IdentitiesManager, type IdentityRow } from "./identities-manager";

export const metadata: Metadata = { title: "Message settings" };

export default async function MessageSettingsPage() {
  const identities = await db.messageIdentity.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  const rows: IdentityRow[] = identities.map((i) => ({
    id: i.id,
    name: i.name,
    greeting: i.greeting,
    signOff: i.signOff,
    signatureName: i.signatureName,
    email: i.email,
    phone: i.phone,
    isDefault: i.isDefault,
  }));

  return <IdentitiesManager identities={rows} />;
}
