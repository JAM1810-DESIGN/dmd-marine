import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isFacebookConfigured } from "@/lib/facebook";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FacebookInbox } from "../facebook-inbox";

export const metadata: Metadata = { title: "Facebook Inbox" };

export default async function FacebookInboxPage() {
  const session = await auth();
  const canManage =
    session?.user.role === "ADMIN" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "STAFF";

  const leads = await db.facebookLead.findMany({
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, include: { fromUser: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Messenger conversations and lead form submissions from your Page.
        </p>
        {!isFacebookConfigured && (
          <Alert variant="warning" className="mt-3">
            <AlertDescription>
              Not connected yet — set the FACEBOOK_* environment variables to receive live messages.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <FacebookInbox
        canManage={canManage}
        leads={leads.map((lead) => ({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          status: lead.status,
          customerId: lead.customerId,
          updatedAt: lead.updatedAt.toISOString(),
          messages: lead.messages.map((message) => ({
            id: message.id,
            body: message.body,
            fromUserId: message.fromUserId,
            fromUserName: message.fromUser?.name ?? null,
            isRead: message.isRead,
            createdAt: message.createdAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
