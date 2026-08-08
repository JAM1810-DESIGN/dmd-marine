import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ComposeDialog } from "./compose-dialog";
import { MessagesList } from "./messages-list";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [inboxMessages, sentMessages, archivedMessages, recipients] = await Promise.all([
    db.message.findMany({
      where: { toUserId: userId, channel: "INTERNAL", archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { fromUser: true },
    }),
    db.message.findMany({
      where: { fromUserId: userId, channel: "INTERNAL", archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { toUser: true },
    }),
    db.message.findMany({
      where: {
        channel: "INTERNAL",
        archivedAt: { not: null },
        OR: [{ toUserId: userId }, { fromUserId: userId }],
      },
      orderBy: { archivedAt: "desc" },
      take: 200,
      include: { fromUser: true, toUser: true },
    }),
    db.user.findMany({
      where: { isActive: true, id: { not: userId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">Internal messages between staff.</p>
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

      <MessagesList
        inbox={inboxMessages.map((message) => ({
          id: message.id,
          subject: message.subject,
          body: message.body,
          isRead: message.isRead,
          createdAt: message.createdAt.toISOString(),
          counterpartName: message.fromUser?.name ?? "Unknown",
          counterpartId: message.fromUserId,
        }))}
        sent={sentMessages.map((message) => ({
          id: message.id,
          subject: message.subject,
          body: message.body,
          isRead: message.isRead,
          createdAt: message.createdAt.toISOString(),
          counterpartName: message.toUser?.name ?? "Unknown",
          counterpartId: message.toUserId,
        }))}
        archived={archivedMessages.map((message) => {
          const received = message.toUserId === userId;
          return {
            id: message.id,
            subject: message.subject,
            body: message.body,
            isRead: message.isRead,
            createdAt: message.createdAt.toISOString(),
            counterpartName: (received ? message.fromUser?.name : message.toUser?.name) ?? "Unknown",
            counterpartId: received ? message.fromUserId : message.toUserId,
          };
        })}
      />
    </div>
  );
}
