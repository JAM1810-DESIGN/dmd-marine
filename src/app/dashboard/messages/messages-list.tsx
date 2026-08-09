"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MessageSquare, Search, Sparkles, Send, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  markThreadRead,
  archiveConversation,
  unarchiveConversation,
  draftReply,
  sendMessage,
} from "./actions";

export type ThreadMessage = {
  id: string;
  body: string;
  mine: boolean;
  isRead: boolean;
  createdAt: string;
};

export type Thread = {
  counterpartId: string;
  counterpartName: string;
  messages: ThreadMessage[];
  lastAt: string;
  unreadCount: number;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function Composer({ thread }: { thread: Thread }) {
  const [body, setBody] = useState("");
  const [drafting, startDraft] = useTransition();
  const [sending, startSend] = useTransition();

  const lastInbound = [...thread.messages].reverse().find((m) => !m.mine);

  function aiDraft() {
    if (!lastInbound) {
      notify.error("No message to reply to yet.");
      return;
    }
    startDraft(async () => {
      const result = await draftReply(lastInbound.id);
      if (result.error) notify.error(result.error);
      else if (result.draft) setBody(result.draft);
    });
  }

  function send() {
    if (!body.trim()) return;
    const formData = new FormData();
    formData.set("toUserId", thread.counterpartId);
    formData.set("subject", "");
    formData.set("body", body);
    startSend(async () => {
      const result = await sendMessage({}, formData);
      if (result.error) notify.error(result.error);
      else {
        notify.success("Sent");
        setBody("");
      }
    });
  }

  return (
    <div className="border-t border-border p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reply</span>
        <Button variant="outline" size="sm" onClick={aiDraft} disabled={drafting}>
          <Sparkles className="size-4" />
          {drafting ? "Drafting..." : "AI draft"}
        </Button>
      </div>
      <Textarea
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a message, or let AI draft one..."
      />
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={send} disabled={sending || !body.trim()}>
          <Send className="size-4" />
          {sending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}

export function MessagesList({ active, archived }: { active: Thread[]; archived: Thread[] }) {
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const threads = showArchived ? archived : active;
  const totalUnread = active.reduce((sum, t) => sum + t.unreadCount, 0);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter(
      (thread) =>
        thread.counterpartName.toLowerCase().includes(query) ||
        thread.messages.some((m) => m.body.toLowerCase().includes(query)),
    );
  }, [threads, search]);

  const selected = filtered.find((t) => t.counterpartId === selectedId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [selectedId, selected?.messages.length]);

  function openThread(thread: Thread) {
    setSelectedId(thread.counterpartId);
    if (!showArchived && thread.unreadCount > 0) {
      startTransition(() => {
        void markThreadRead(thread.counterpartId);
      });
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <Button variant={!showArchived ? "default" : "ghost"} size="sm" onClick={() => { setShowArchived(false); setSelectedId(null); }}>
          Conversations {totalUnread > 0 && `(${totalUnread})`}
        </Button>
        <Button variant={showArchived ? "default" : "ghost"} size="sm" onClick={() => { setShowArchived(true); setSelectedId(null); }}>
          Archived
        </Button>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 w-48 pl-8"
          />
        </div>
      </div>

      <div className="grid min-h-[26rem] grid-cols-1 sm:grid-cols-[minmax(220px,300px)_1fr]">
        <div className="border-b border-border sm:border-b-0 sm:border-r">
          {filtered.length === 0 ? (
            <EmptyState
              className="border-none"
              icon={MessageSquare}
              title={search ? "No matches" : showArchived ? "No archived conversations" : "No conversations yet"}
              description={search ? "Try a different search." : "Start one with New Message."}
            />
          ) : (
            <ul className="flex max-h-[26rem] flex-col divide-y divide-border overflow-y-auto">
              {filtered.map((thread) => {
                const last = thread.messages[thread.messages.length - 1];
                return (
                  <li key={thread.counterpartId}>
                    <button
                      type="button"
                      onClick={() => openThread(thread)}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-secondary/40",
                        selectedId === thread.counterpartId && "bg-secondary/60",
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                        {initials(thread.counterpartName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm text-foreground",
                            thread.unreadCount > 0 ? "font-semibold" : "font-medium",
                          )}
                        >
                          {thread.counterpartName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {last ? `${last.mine ? "You: " : ""}${last.body}` : "No messages"}
                        </span>
                      </span>
                      {thread.unreadCount > 0 && (
                        <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
                          {thread.unreadCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-4">
              <p className="text-sm text-muted-foreground">Select a conversation.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                    {initials(selected.counterpartName)}
                  </span>
                  <p className="font-medium text-foreground">{selected.counterpartName}</p>
                </div>
                {showArchived ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await unarchiveConversation(selected.counterpartId);
                        if (result.error) notify.error(result.error);
                        else {
                          notify.success("Conversation restored");
                          setSelectedId(null);
                        }
                      })
                    }
                  >
                    <ArchiveRestore className="size-4" />
                    Restore
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await archiveConversation(selected.counterpartId);
                        if (result.error) notify.error(result.error);
                        else {
                          notify.success("Conversation archived");
                          setSelectedId(null);
                        }
                      })
                    }
                  >
                    <Archive className="size-4" />
                    Archive
                  </Button>
                )}
              </div>

              <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
                {selected.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                      message.mine
                        ? "self-end bg-accent/15 text-foreground"
                        : "self-start bg-secondary/60 text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatTime(message.createdAt)}</p>
                  </div>
                ))}
              </div>

              {showArchived ? (
                <div className="border-t border-border p-3">
                  <Badge variant="outline">Archived — restore to reply</Badge>
                </div>
              ) : (
                <Composer thread={selected} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
