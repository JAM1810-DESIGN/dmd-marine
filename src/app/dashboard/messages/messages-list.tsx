"use client";

import { useMemo, useState, useTransition } from "react";
import { MessageSquare, Search, CheckCheck, Trash2, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { markMessageRead, markAllRead, deleteMessage, draftReply, sendMessage } from "./actions";

export type MessageRow = {
  id: string;
  subject: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
  counterpartName: string;
  counterpartId: string | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function ReplyComposer({ message }: { message: MessageRow }) {
  const [body, setBody] = useState("");
  const [drafting, startDraft] = useTransition();
  const [sending, startSend] = useTransition();

  function aiDraft() {
    startDraft(async () => {
      const result = await draftReply(message.id);
      if (result.error) {
        notify.error(result.error);
        return;
      }
      if (result.draft) setBody(result.draft);
    });
  }

  function send() {
    if (!message.counterpartId || !body.trim()) return;
    const formData = new FormData();
    formData.set("toUserId", message.counterpartId);
    formData.set("subject", message.subject ? `Re: ${message.subject}` : "Re: (no subject)");
    formData.set("body", body);
    startSend(async () => {
      const result = await sendMessage({}, formData);
      if (result.error) {
        notify.error(result.error);
        return;
      }
      notify.success("Reply sent");
      setBody("");
    });
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Reply to {message.counterpartName}
        </p>
        <Button variant="outline" size="sm" onClick={aiDraft} disabled={drafting}>
          <Sparkles className="size-4" />
          {drafting ? "Drafting..." : "AI draft"}
        </Button>
      </div>
      <Textarea
        rows={4}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a reply, or let AI draft one..."
      />
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={send} disabled={sending || !body.trim()}>
          <Send className="size-4" />
          {sending ? "Sending..." : "Send reply"}
        </Button>
      </div>
    </div>
  );
}

export function MessagesList({ inbox, sent }: { inbox: MessageRow[]; sent: MessageRow[] }) {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [markPending, startMark] = useTransition();

  const items = tab === "inbox" ? inbox : sent;
  const unread = inbox.filter((m) => !m.isRead).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (message) =>
        (message.subject ?? "").toLowerCase().includes(query) ||
        message.body.toLowerCase().includes(query) ||
        message.counterpartName.toLowerCase().includes(query),
    );
  }, [items, search]);

  const selected = filtered.find((m) => m.id === selectedId) ?? null;

  function openMessage(message: MessageRow) {
    setSelectedId(message.id);
    if (tab === "inbox" && !message.isRead) {
      startMark(() => markMessageRead(message.id));
    }
  }

  function switchTab(next: "inbox" | "sent") {
    setTab(next);
    setSelectedId(null);
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <Button variant={tab === "inbox" ? "default" : "ghost"} size="sm" onClick={() => switchTab("inbox")}>
          Inbox {unread > 0 && `(${unread})`}
        </Button>
        <Button variant={tab === "sent" ? "default" : "ghost"} size="sm" onClick={() => switchTab("sent")}>
          Sent
        </Button>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 w-48 pl-8"
          />
        </div>
        {tab === "inbox" && unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={markPending}
            onClick={() =>
              startMark(async () => {
                const result = await markAllRead();
                if (result.error) notify.error(result.error);
                else notify.success("All marked read");
              })
            }
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="grid min-h-80 grid-cols-1 sm:grid-cols-[minmax(220px,300px)_1fr]">
        <div className="border-b border-border sm:border-b-0 sm:border-r">
          {filtered.length === 0 ? (
            <EmptyState
              className="border-none"
              icon={MessageSquare}
              title={search ? "No matches" : tab === "inbox" ? "No messages yet" : "No sent messages yet"}
              description={search ? "Try a different search." : "New messages will appear here."}
            />
          ) : (
            <ul className="flex max-h-[28rem] flex-col divide-y divide-border overflow-y-auto">
              {filtered.map((message) => {
                const unreadRow = tab === "inbox" && !message.isRead;
                return (
                  <li key={message.id}>
                    <button
                      type="button"
                      onClick={() => openMessage(message)}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-secondary/40",
                        selectedId === message.id && "bg-secondary/60",
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                        {initials(message.counterpartName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm",
                            unreadRow ? "font-semibold text-foreground" : "font-medium text-foreground",
                          )}
                        >
                          {message.subject || "(no subject)"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {message.counterpartName} · {formatDateTime(message.createdAt)}
                        </span>
                      </span>
                      {unreadRow && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-4">
          {!selected ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a message to read it.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{selected.subject || "(no subject)"}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent/15 text-[10px] font-medium text-accent">
                      {initials(selected.counterpartName)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {tab === "inbox" ? "From" : "To"} {selected.counterpartName} · {formatDateTime(selected.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {tab === "sent" && <Badge variant="outline">Sent</Badge>}
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Delete message">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    }
                    title="Delete this message?"
                    description="This removes it from your view. This can't be undone."
                    confirmLabel="Delete"
                    variant="destructive"
                    onConfirm={async () => {
                      const result = await deleteMessage(selected.id);
                      if (result.error) notify.error(result.error);
                      else {
                        notify.success("Message deleted");
                        setSelectedId(null);
                      }
                    }}
                  />
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-sm text-foreground">
                {selected.body}
              </p>

              {tab === "inbox" && selected.counterpartId && <ReplyComposer message={selected} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
