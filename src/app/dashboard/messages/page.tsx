import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ComposeDialog } from "./compose-dialog";
import { MessagesList, type Thread, type ThreadMessage } from "./messages-list";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [messages, external, recipients] = await Promise.all([
    db.message.findMany({
      where: {
        channel: "INTERNAL",
        OR: [{ toUserId: userId }, { fromUserId: userId }],
      },
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
    db.user.findMany({
      where: { isActive: true, id: { not: userId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Group messages into per-counterpart threads (active vs archived).
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
        mine,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
      };

      const existing = map.get(counterpartId);
      if (existing) {
        existing.messages.push(entry);
      } else {
        map.set(counterpartId, {
          counterpartId,
          counterpartName,
          messages: [entry],
          lastAt: entry.createdAt,
          unreadCount: 0,
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
        mine,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
      };

      const key = `email:${email}`;
      const existing = map.get(key);
      const isRequest = !mine && (message.payload as { kind?: string } | null)?.kind === "booking";
      if (existing) {
        existing.messages.push(entry);
        if (isRequest) {
          existing.requestMessageId = message.id;
          existing.convertedBookingId = message.bookingId;
        }
      } else {
        map.set(key, {
          counterpartId: key,
          counterpartName: message.externalName ?? email,
          messages: [entry],
          lastAt: entry.createdAt,
          unreadCount: 0,
          external: true,
          externalEmail: email,
          requestMessageId: isRequest ? message.id : null,
          convertedBookingId: isRequest ? message.bookingId : null,
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">
            Staff conversations and website requests. Confirm a request to turn it into a booking.
          </p>
        </div>
        <ComposeDialog
          recipients={recipients}
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              New Message
            </Button>
          }
        />
      </div>

      <MessagesList active={active} archived={archived} />
    </div>
  );
}
