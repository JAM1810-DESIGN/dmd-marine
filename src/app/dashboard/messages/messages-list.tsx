"use client";

import { useState, useTransition } from "react";
import { Mail, MailOpen, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { markMessageRead } from "./actions";

export type MessageRow = {
  id: string;
  subject: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
  counterpartName: string;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function MessageItem({
  message,
  direction,
}: {
  message: MessageRow;
  direction: "inbox" | "sent";
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    setExpanded((value) => !value);
    if (direction === "inbox" && !message.isRead) {
      startTransition(() => markMessageRead(message.id));
    }
  }

  return (
    <li className="px-4 py-3">
      <button type="button" onClick={toggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="flex items-start gap-3">
          {direction === "inbox" &&
            (message.isRead || isPending ? (
              <MailOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            ) : (
              <Mail className="mt-0.5 size-4 shrink-0 text-navy" />
            ))}
          <div>
            <p className={`text-sm ${!message.isRead && direction === "inbox" ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
              {message.subject || "(no subject)"}
            </p>
            <p className="text-xs text-muted-foreground">
              {direction === "inbox" ? `From ${message.counterpartName}` : `To ${message.counterpartName}`} ·{" "}
              {formatDateTime(message.createdAt)}
            </p>
          </div>
        </div>
        {!message.isRead && direction === "inbox" && <Badge>New</Badge>}
      </button>
      {expanded && (
        <p className="mt-2 ml-7 whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
      )}
    </li>
  );
}

export function MessagesList({
  inbox,
  sent,
}: {
  inbox: MessageRow[];
  sent: MessageRow[];
}) {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const items = tab === "inbox" ? inbox : sent;

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center gap-1 border-b border-border p-2">
        <Button variant={tab === "inbox" ? "default" : "ghost"} size="sm" onClick={() => setTab("inbox")}>
          Inbox {inbox.filter((m) => !m.isRead).length > 0 && `(${inbox.filter((m) => !m.isRead).length})`}
        </Button>
        <Button variant={tab === "sent" ? "default" : "ghost"} size="sm" onClick={() => setTab("sent")}>
          Sent
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          className="border-none"
          icon={MessageSquare}
          title={tab === "inbox" ? "No messages yet" : "No sent messages yet"}
          description={
            tab === "inbox"
              ? "New messages will appear here."
              : "Messages you send will appear here."
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((message) => (
            <MessageItem key={message.id} message={message} direction={tab} />
          ))}
        </ul>
      )}
    </div>
  );
}
