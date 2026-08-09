"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  PencilLine,
  Mail,
  Inbox,
  FilePenLine,
  Star,
  Send,
  Archive,
  CalendarPlus,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ComposeDialog, type ComposeProps } from "./compose-dialog";

const FOLDERS = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "draft", label: "Draft", icon: FilePenLine },
  { key: "starred", label: "Starred", icon: Star },
  { key: "sent", label: "Sent", icon: Send },
  { key: "archived", label: "Archived", icon: Archive },
  { key: "requests", label: "Requests", icon: CalendarPlus },
] as const;

export function MessagesNav({
  compose,
  counts,
}: {
  compose: ComposeProps;
  counts: { inbox: number; draft: number; requests: number };
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const onMail = pathname === "/dashboard/messages";
  const folder = params.get("folder") ?? "inbox";

  const countFor = (key: string) =>
    key === "inbox" ? counts.inbox : key === "draft" ? counts.draft : key === "requests" ? counts.requests : 0;

  return (
    <nav className="w-full shrink-0 rounded-xl bg-card p-2 ring-1 ring-foreground/10 sm:w-52">
      <ComposeDialog
        {...compose}
        trigger={
          <button
            type="button"
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <PencilLine className="size-4" />
            Compose
          </button>
        }
      />

      <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Console</p>

      <Link
        href="/dashboard/messages"
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
          onMail ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/50",
        )}
      >
        <Mail className="size-4" />
        Mail
      </Link>

      {onMail && (
        <ul className="my-1 ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
          {FOLDERS.map(({ key, label, icon: Icon }) => {
            const active = folder === key;
            const count = countFor(key);
            return (
              <li key={key}>
                <Link
                  href={`/dashboard/messages?folder=${key}`}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                    active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/50",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                  {count > 0 && (
                    <span className="ml-auto rounded-full bg-accent/15 px-1.5 text-[10px] font-medium text-accent">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/dashboard/messages/contacts"
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
          pathname.startsWith("/dashboard/messages/contacts")
            ? "bg-secondary font-medium text-foreground"
            : "text-muted-foreground hover:bg-secondary/50",
        )}
      >
        <Users className="size-4" />
        Contacts
      </Link>

      <Link
        href="/dashboard/messages/settings"
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
          pathname.startsWith("/dashboard/messages/settings")
            ? "bg-secondary font-medium text-foreground"
            : "text-muted-foreground hover:bg-secondary/50",
        )}
      >
        <Settings className="size-4" />
        Settings
      </Link>
    </nav>
  );
}
