import { auth } from "@/auth";
import { db } from "@/lib/db";
import { MessagesNav } from "./messages-nav";
import type { ComposeIdentity } from "./compose-dialog";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session!.user.id;

  const [recipients, contacts, identities, inboxUnread, draftCount, requestCount] = await Promise.all([
    db.user.findMany({
      where: { isActive: true, id: { not: userId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.contact.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    db.messageIdentity.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    db.message.count({
      where: {
        isRead: false,
        archivedAt: null,
        OR: [
          { channel: "INTERNAL", toUserId: userId },
          { channel: "EMAIL", fromUserId: null, externalEmail: { not: null } },
        ],
      },
    }),
    db.emailDraft.count({ where: { userId } }),
    db.message.count({
      where: { channel: "EMAIL", bookingId: null, payload: { path: ["kind"], equals: "booking" } },
    }),
  ]);

  const composeIdentities: ComposeIdentity[] = identities.map((identity) => ({
    id: identity.id,
    name: identity.name,
    greeting: identity.greeting,
    signOff: identity.signOff,
    signatureName: identity.signatureName,
    email: identity.email,
    phone: identity.phone,
    isDefault: identity.isDefault,
  }));

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <MessagesNav
        compose={{ recipients, contacts, identities: composeIdentities }}
        counts={{ inbox: inboxUnread, draft: draftCount, requests: requestCount }}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
