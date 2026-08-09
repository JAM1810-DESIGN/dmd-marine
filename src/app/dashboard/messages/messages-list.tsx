"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Inbox,
  Star,
  Send as SendIcon,
  CalendarCheck,
  Archive,
  ArchiveRestore,
  Search,
  Sparkles,
  Send,
  Mail,
  ArrowLeft,
  RefreshCw,
  MailOpen,
  Paperclip,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  markThreadRead,
  markExternalThreadRead,
  archiveConversation,
  unarchiveConversation,
  archiveExternal,
  unarchiveExternal,
  toggleStarInternal,
  toggleStarExternal,
  replyExternal,
  confirmExternalBooking,
  createBookingFromThread,
  draftReply,
  sendMessage,
} from "./actions";

export type ThreadMessage = {
  id: string;
  body: string;
  subject: string | null;
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
  starred?: boolean;
  external?: boolean;
  externalEmail?: string;
  requestMessageId?: string | null;
  convertedBookingId?: string | null;
};

type Folder = "inbox" | "starred" | "sent" | "requests" | "archived";

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

/** Short, Gmail-like relative time for list rows. */
function shortTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYest =
    date.getFullYear() === yest.getFullYear() &&
    date.getMonth() === yest.getMonth() &&
    date.getDate() === yest.getDate();
  if (isYest) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function subjectAndSnippet(thread: Thread) {
  const last = thread.messages[thread.messages.length - 1];
  const subject =
    thread.messages.find((m) => m.subject && m.subject.trim())?.subject?.replace(/^Re:\s*/i, "").trim() ?? "";
  const snippet = last ? `${last.mine ? "You: " : ""}${last.body}` : "";
  return { subject, snippet };
}

/** One row of the email header (From / To / Cc / Subject). */
function HeaderRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 py-1">
      <span className="w-14 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Composer({ thread }: { thread: Thread }) {
  const defaultSubject = () => {
    const base = thread.messages.find((m) => m.subject && m.subject.trim())?.subject?.trim();
    if (!base) return "Re: your message";
    return /^re:/i.test(base) ? base : `Re: ${base}`;
  };

  const [body, setBody] = useState("");
  const [to, setTo] = useState(thread.externalEmail ?? "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [drafting, startDraft] = useTransition();
  const [sending, startSend] = useTransition();
  const [booking, startBooking] = useTransition();

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 5));
    if (fileInput.current) fileInput.current.value = "";
  }
  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const lastInbound = [...thread.messages].reverse().find((m) => !m.mine);
  const alreadyBooked = Boolean(thread.convertedBookingId);

  function book() {
    startBooking(async () => {
      const result = thread.requestMessageId
        ? await confirmExternalBooking(thread.requestMessageId)
        : await createBookingFromThread(thread.externalEmail ?? "", thread.counterpartName);
      if (result.error) notify.error(result.error);
      else notify.success("Booking created");
    });
  }

  function aiDraft() {
    if (!lastInbound || thread.external) {
      notify.error(thread.external ? "AI draft is for internal messages." : "No message to reply to yet.");
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
    startSend(async () => {
      if (thread.external && thread.externalEmail) {
        const fd = new FormData();
        fd.set("threadEmail", thread.externalEmail);
        fd.set("to", to);
        fd.set("cc", cc);
        fd.set("externalName", thread.counterpartName);
        fd.set("subject", subject);
        fd.set("body", body);
        for (const file of files) fd.append("attachments", file);
        const result = await replyExternal(fd);
        if (result.error) notify.error(result.error);
        else {
          if (result.warning) notify.info(result.warning);
          else notify.success("Reply emailed");
          setBody("");
          setCc("");
          setFiles([]);
        }
        return;
      }
      const formData = new FormData();
      formData.set("toUserId", thread.counterpartId);
      formData.set("subject", "");
      formData.set("body", body);
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
      {thread.external ? (
        <div className="mb-2">
          <HeaderRow label="From">
            <span className="text-sm text-foreground">DMD Marine &lt;dmdmarine2010@gmail.com&gt;</span>
          </HeaderRow>
          <HeaderRow label="To">
            <input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="recipient@email.com"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </HeaderRow>
          <HeaderRow label="Cc">
            <input
              value={cc}
              onChange={(event) => setCc(event.target.value)}
              placeholder="Add Cc (comma-separated)"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </HeaderRow>
          <HeaderRow label="Subject">
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </HeaderRow>
        </div>
      ) : (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reply</span>
          <Button variant="outline" size="sm" onClick={aiDraft} disabled={drafting}>
            <Sparkles className="size-4" />
            {drafting ? "Drafting..." : "AI draft"}
          </Button>
        </div>
      )}
      <Textarea
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={thread.external ? "Write an email reply..." : "Write a message, or let AI draft one..."}
      />

      {thread.external && (
        <>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(event) => addFiles(event.target.files)}
          />
          {files.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-1 text-xs text-foreground"
                >
                  <FileText className="size-3.5 text-muted-foreground" />
                  <span className="max-w-[10rem] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="mt-2 flex items-center justify-end gap-2">
        {thread.external && (
          <Button
            variant="ghost"
            size="sm"
            className="mr-auto"
            onClick={() => fileInput.current?.click()}
            aria-label="Attach files"
          >
            <Paperclip className="size-4" />
            Attach
          </Button>
        )}
        {thread.external &&
          (alreadyBooked ? (
            <Badge variant="outline">
              <CalendarCheck className="size-3.5" />
              Booked
            </Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={book} disabled={booking}>
              <CalendarCheck className="size-4" />
              {booking ? "Booking..." : "Booked"}
            </Button>
          ))}
        <Button size="sm" onClick={send} disabled={sending || !body.trim()}>
          <Send className="size-4" />
          {sending ? "Sending..." : thread.external ? "Send email" : "Send"}
        </Button>
      </div>
    </div>
  );
}

export function MessagesList({ active, archived }: { active: Thread[]; archived: Thread[] }) {
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isArchivedFolder = folder === "archived";

  // Derive folder contents from the two source lists.
  const folderThreads = useMemo<Thread[]>(() => {
    if (folder === "archived") return archived;
    if (folder === "starred") return active.filter((t) => t.starred);
    if (folder === "sent")
      return active.filter((t) => t.messages[t.messages.length - 1]?.mine);
    if (folder === "requests")
      return active.filter((t) => t.external && t.requestMessageId && !t.convertedBookingId);
    return active; // inbox
  }, [folder, active, archived]);

  const counts = useMemo(
    () => ({
      inboxUnread: active.reduce((sum, t) => sum + t.unreadCount, 0),
      starred: active.filter((t) => t.starred).length,
      requests: active.filter((t) => t.external && t.requestMessageId && !t.convertedBookingId).length,
    }),
    [active],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return folderThreads;
    return folderThreads.filter(
      (thread) =>
        thread.counterpartName.toLowerCase().includes(query) ||
        thread.messages.some((m) => m.body.toLowerCase().includes(query)),
    );
  }, [folderThreads, search]);

  const selected = filtered.find((t) => t.counterpartId === selectedId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [selectedId, selected?.messages.length]);

  // Clear selection/checks when switching folders.
  function switchFolder(next: Folder) {
    setFolder(next);
    setSelectedId(null);
    setChecked(new Set());
  }

  function openThread(thread: Thread) {
    setSelectedId(thread.counterpartId);
    if (!isArchivedFolder && thread.unreadCount > 0) {
      startTransition(() => {
        if (thread.external && thread.externalEmail) void markExternalThreadRead(thread.externalEmail);
        else void markThreadRead(thread.counterpartId);
      });
    }
  }

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleStar(thread: Thread) {
    const next = !thread.starred;
    startTransition(async () => {
      const result =
        thread.external && thread.externalEmail
          ? await toggleStarExternal(thread.externalEmail, next)
          : await toggleStarInternal(thread.counterpartId, next);
      if (result.error) notify.error(result.error);
    });
  }

  const checkedThreads = filtered.filter((t) => checked.has(t.counterpartId));

  function bulkArchive() {
    startTransition(async () => {
      await Promise.all(
        checkedThreads.map((t) =>
          t.external && t.externalEmail ? archiveExternal(t.externalEmail) : archiveConversation(t.counterpartId),
        ),
      );
      notify.success(`Archived ${checkedThreads.length}`);
      setChecked(new Set());
    });
  }

  function bulkMarkRead() {
    startTransition(async () => {
      await Promise.all(
        checkedThreads.map((t) =>
          t.external && t.externalEmail ? markExternalThreadRead(t.externalEmail) : markThreadRead(t.counterpartId),
        ),
      );
      notify.success("Marked as read");
      setChecked(new Set());
    });
  }

  function bulkStar() {
    startTransition(async () => {
      await Promise.all(
        checkedThreads.map((t) =>
          t.external && t.externalEmail
            ? toggleStarExternal(t.externalEmail, true)
            : toggleStarInternal(t.counterpartId, true),
        ),
      );
      notify.success("Starred");
      setChecked(new Set());
    });
  }

  const allChecked = filtered.length > 0 && filtered.every((t) => checked.has(t.counterpartId));
  function toggleCheckAll() {
    setChecked(allChecked ? new Set() : new Set(filtered.map((t) => t.counterpartId)));
  }

  const folders: { key: Folder; label: string; icon: typeof Inbox; badge?: number }[] = [
    { key: "inbox", label: "Inbox", icon: Inbox, badge: counts.inboxUnread },
    { key: "starred", label: "Starred", icon: Star, badge: counts.starred },
    { key: "sent", label: "Sent", icon: SendIcon },
    { key: "requests", label: "Requests", icon: CalendarCheck, badge: counts.requests },
    { key: "archived", label: "Archived", icon: Archive },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr]">
      {/* Folder rail */}
      <nav className="flex flex-row gap-1 overflow-x-auto sm:flex-col">
        {folders.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchFolder(key)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              folder === key
                ? "bg-accent/15 font-medium text-accent"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
            {badge ? (
              <span className="ml-auto rounded-full bg-accent/20 px-1.5 text-[11px] font-medium text-accent">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Main panel */}
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {selected ? (
          <ReadingPane
            thread={selected}
            isArchivedFolder={isArchivedFolder}
            isPending={isPending}
            scrollRef={scrollRef}
            onBack={() => setSelectedId(null)}
            onStar={() => toggleStar(selected)}
            onArchive={() =>
              startTransition(async () => {
                const result =
                  selected.external && selected.externalEmail
                    ? await archiveExternal(selected.externalEmail)
                    : await archiveConversation(selected.counterpartId);
                if (result.error) notify.error(result.error);
                else {
                  notify.success("Conversation archived");
                  setSelectedId(null);
                }
              })
            }
            onRestore={() =>
              startTransition(async () => {
                const result =
                  selected.external && selected.externalEmail
                    ? await unarchiveExternal(selected.externalEmail)
                    : await unarchiveConversation(selected.counterpartId);
                if (result.error) notify.error(result.error);
                else {
                  notify.success("Conversation restored");
                  setSelectedId(null);
                }
              })
            }
          />
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleCheckAll}
                  className="size-4 rounded border-border accent-accent"
                  aria-label="Select all"
                />
              </label>
              {checked.size > 0 ? (
                <>
                  <span className="text-xs text-muted-foreground">{checked.size} selected</span>
                  <Button variant="ghost" size="sm" onClick={bulkArchive} disabled={isPending}>
                    <Archive className="size-4" />
                    Archive
                  </Button>
                  <Button variant="ghost" size="sm" onClick={bulkMarkRead} disabled={isPending}>
                    <MailOpen className="size-4" />
                    Mark read
                  </Button>
                  <Button variant="ghost" size="sm" onClick={bulkStar} disabled={isPending}>
                    <Star className="size-4" />
                    Star
                  </Button>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium capitalize text-foreground">
                  <RefreshCw className={cn("size-3.5 text-muted-foreground", isPending && "animate-spin")} />
                  {folder}
                </span>
              )}
              <div className="relative ml-auto">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search mail..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-8 w-40 pl-8 sm:w-56"
                />
              </div>
            </div>

            {/* Row list */}
            {filtered.length === 0 ? (
              <EmptyState
                className="border-none"
                icon={Mail}
                title={search ? "No matches" : `No mail in ${folder}`}
                description={search ? "Try a different search." : "Messages will show up here."}
              />
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((thread) => {
                  const { subject, snippet } = subjectAndSnippet(thread);
                  const unread = thread.unreadCount > 0 && !isArchivedFolder;
                  const last = thread.messages[thread.messages.length - 1];
                  return (
                    <li
                      key={thread.counterpartId}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-secondary/40",
                        checked.has(thread.counterpartId) && "bg-accent/5",
                        unread && "bg-background",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked.has(thread.counterpartId)}
                        onChange={() => toggleCheck(thread.counterpartId)}
                        className="size-4 shrink-0 rounded border-border accent-accent"
                        aria-label={`Select ${thread.counterpartName}`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleStar(thread)}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-amber-500"
                        aria-label={thread.starred ? "Unstar" : "Star"}
                      >
                        <Star className={cn("size-4", thread.starred && "fill-amber-400 text-amber-500")} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openThread(thread)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span
                          className={cn(
                            "w-32 shrink-0 truncate text-sm sm:w-40",
                            unread ? "font-semibold text-foreground" : "text-foreground/90",
                          )}
                        >
                          {thread.external && <Mail className="mr-1 inline size-3 text-muted-foreground" />}
                          {thread.counterpartName}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {subject && (
                            <span className={cn(unread ? "font-semibold text-foreground" : "text-foreground/90")}>
                              {subject}
                            </span>
                          )}
                          {subject && snippet && <span className="text-muted-foreground"> — </span>}
                          <span className="text-muted-foreground">{snippet}</span>
                        </span>
                        {thread.external && thread.requestMessageId && !thread.convertedBookingId && (
                          <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                            Request
                          </Badge>
                        )}
                        <span
                          className={cn(
                            "w-16 shrink-0 text-right text-xs",
                            unread ? "font-semibold text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {last ? shortTime(last.createdAt) : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReadingPane({
  thread,
  isArchivedFolder,
  isPending,
  scrollRef,
  onBack,
  onStar,
  onArchive,
  onRestore,
}: {
  thread: Thread;
  isArchivedFolder: boolean;
  isPending: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onStar: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const { subject } = subjectAndSnippet(thread);
  return (
    <div className="flex min-h-[28rem] flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border p-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to list">
          <ArrowLeft className="size-4" />
        </Button>
        <button
          type="button"
          onClick={onStar}
          className="text-muted-foreground transition-colors hover:text-amber-500"
          aria-label={thread.starred ? "Unstar" : "Star"}
        >
          <Star className={cn("size-4", thread.starred && "fill-amber-400 text-amber-500")} />
        </button>
        <span className="flex size-8 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
          {initials(thread.counterpartName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{thread.counterpartName}</p>
          {thread.external ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="size-3" />
              {thread.externalEmail} · Website
            </p>
          ) : subject ? (
            <p className="truncate text-xs text-muted-foreground">{subject}</p>
          ) : null}
        </div>
        {thread.external && thread.convertedBookingId ? (
          <Badge variant="outline">
            <CalendarCheck className="size-3.5" />
            Booking created
          </Badge>
        ) : null}
        {isArchivedFolder ? (
          <Button variant="ghost" size="sm" disabled={isPending} onClick={onRestore}>
            <ArchiveRestore className="size-4" />
            Restore
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled={isPending} onClick={onArchive}>
            <Archive className="size-4" />
            Archive
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {thread.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[80%] rounded-xl px-3 py-2 text-sm",
              message.mine ? "self-end bg-accent/15 text-foreground" : "self-start bg-secondary/60 text-foreground",
            )}
          >
            <p className="whitespace-pre-wrap">{message.body}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{formatTime(message.createdAt)}</p>
          </div>
        ))}
      </div>

      {isArchivedFolder ? (
        <div className="border-t border-border p-3">
          <Badge variant="outline">Archived — restore to reply</Badge>
        </div>
      ) : (
        <Composer thread={thread} />
      )}
    </div>
  );
}
