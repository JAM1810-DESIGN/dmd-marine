import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { MessagesList, type Thread, type ThreadMessage, type MailFolder } from "./messages-list";
import { DraftsPanel, type DraftRow } from "./drafts-panel";
import type { ComposeIdentity } from "./compose-dialog";

export const metadata: Metadata = { title: "Messages" };

const FOLDERS = ["inbox", "starred", "sent", "requests", "archived", "draft"] as const;
type Folder = (typeof FOLDERS)[number];

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;

  const { folder: folderParam } = await searchParams;
  const folder: Folder = (FOLDERS as readonly string[]).includes(folderParam ?? "")
    ? (folderParam as Folder)
    : "inbox";

  // Draft folder is a per-user list of unsent emails — not thread-based.
  if (folder === "draft") {
    const [drafts, recipients, contacts, identities] = await Promise.all([
      db.emailDraft.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
      db.user.findMany({
        where: { isActive: true, id: { not: userId } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.contact.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
      db.messageIdentity.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    ]);

    const composeIdentities: ComposeIdentity[] = identities.map((i) => ({
      id: i.id,
      name: i.name,
      greeting: i.greeting,
      signOff: i.signOff,
      signatureName: i.signatureName,
      email: i.email,
      phone: i.phone,
      isDefault: i.isDefault,
    }));

    const rows: DraftRow[] = drafts.map((d) => ({
      id: d.id,
      to: d.to,
      cc: d.cc,
      subject: d.subject,
      body: d.body,
      updatedAt: d.updatedAt.toISOString(),
    }));

    return <DraftsPanel drafts={rows} compose={{ recipients, contacts, identities: composeIdentities }} />;
  }

  const [messages, external, identity] = await Promise.all([
    db.message.findMany({
      where: { channel: "INTERNAL", OR: [{ toUserId: userId }, { fromUserId: userId }] },
      orderBy: { createdAt: "asc" },
      take: 1000,
      include: { fromUser: { select: { id: true, name: true } }, toUser: { select: { id: true, name: true } } },
    }),
    // External (website) conversations are shared across staff.
    db.message.findMany({
      where: { channel: "EMAIL", externalEmail: { not: null } },
      orderBy: { createdAt: "asc" },
      take: 1000,
    }),
    db.messageIdentity.findFirst({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
  ]);

  const defaultIdentity = identity
    ? {
        greeting: identity.greeting,
        signOff: identity.signOff,
        signatureName: identity.signatureName,
        email: identity.email,
        phone: identity.phone,
      }
    : null;

  function buildThreads(archived: boolean): Thread[] {
    const map = new Map<string, Thread>();
    for (const message of messages) {
      const isArchived = message.archivedAt !== null;
      if (isArchived !== archived) continue;
      const mine = message.fromUserId === userId;
      const counterpartId = mine ? message.toUserId : message.fromUserId;
      const counterpartName = (mine ? message.toUser?.name : message.fromUser?.name) ?? "Unknown";
      if (!counterpartId) continue;

      const entry: ThreadMessage = {
        id: message.id,
        body: message.body,
        subject: message.subject,
        mine,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
      };

      const existing = map.get(counterpartId);
      if (existing) {
        existing.messages.push(entry);
        if (message.starredAt) existing.starred = true;
      } else {
        map.set(counterpartId, {
          counterpartId,
          counterpartName,
          messages: [entry],
          lastAt: entry.createdAt,
          unreadCount: 0,
          starred: message.starredAt !== null,
        });
      }
    }
    const threads = Array.from(map.values());
    for (const thread of threads) {
      thread.lastAt = thread.messages[thread.messages.length - 1]?.createdAt ?? thread.lastAt;
      thread.unreadCount = thread.messages.filter((m) => !m.mine && !m.isRead).length;
    }
    return threads.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }

  function buildExternalThreads(archived: boolean): Thread[] {
    const map = new Map<string, Thread>();
    for (const message of external) {
      const isArchived = message.archivedAt !== null;
      if (isArchived !== archived) continue;
      const email = message.externalEmail;
      if (!email) continue;
      const mine = message.fromUserId !== null; // staff reply

      const entry: ThreadMessage = {
        id: message.id,
        body: message.body,
        subject: message.subject,
        mine,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
      };

      const key = `email:${email}`;
      const existing = map.get(key);
      const isRequest = !mine && (message.payload as { kind?: string } | null)?.kind === "booking";
      if (existing) {
        existing.messages.push(entry);
        if (message.starredAt) existing.starred = true;
        if (isRequest) existing.requestMessageId = message.id;
        if (message.bookingId) existing.convertedBookingId = message.bookingId;
      } else {
        map.set(key, {
          counterpartId: key,
          counterpartName: message.externalName ?? email,
          messages: [entry],
          lastAt: entry.createdAt,
          unreadCount: 0,
          starred: message.starredAt !== null,
          external: true,
          externalEmail: email,
          requestMessageId: isRequest ? message.id : null,
          convertedBookingId: message.bookingId,
        });
      }
    }
    const threads = Array.from(map.values());
    for (const thread of threads) {
      thread.lastAt = thread.messages[thread.messages.length - 1]?.createdAt ?? thread.lastAt;
      thread.unreadCount = thread.messages.filter((m) => !m.mine && !m.isRead).length;
    }
    return threads;
  }

  const active = [...buildExternalThreads(false), ...buildThreads(false)].sort((a, b) =>
    b.lastAt.localeCompare(a.lastAt),
  );
  const archived = [...buildExternalThreads(true), ...buildThreads(true)].sort((a, b) =>
    b.lastAt.localeCompare(a.lastAt),
  );

  return (
    <MessagesList
      active={active}
      archived={archived}
      folder={folder as MailFolder}
      defaultIdentity={defaultIdentity}
    />
  );
}
