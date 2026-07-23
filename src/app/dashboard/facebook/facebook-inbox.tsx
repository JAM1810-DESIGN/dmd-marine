"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { replyToLead, markLeadRead, updateLeadStatus, addFacebookLeadToCrm } from "./actions";

const STATUS_OPTIONS = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"] as const;

export type FacebookMessageRow = {
  id: string;
  body: string;
  fromUserId: string | null;
  fromUserName: string | null;
  isRead: boolean;
  createdAt: string;
};

export type FacebookLeadRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  customerId: string | null;
  updatedAt: string;
  messages: FacebookMessageRow[];
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function unreadCount(lead: FacebookLeadRow) {
  return lead.messages.filter((m) => !m.fromUserId && !m.isRead).length;
}

function LeadRowButton({
  lead,
  selected,
  onSelect,
}: {
  lead: FacebookLeadRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const unread = unreadCount(lead);
  const lastMessage = lead.messages[lead.messages.length - 1];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-1 border-l-2 px-4 py-3 text-left transition-colors hover:bg-secondary/40",
        selected ? "border-navy bg-secondary/50" : "border-transparent",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-sm", unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground")}>
          {lead.name ?? "Unknown"}
        </span>
        {unread > 0 && <Badge>{unread}</Badge>}
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {lastMessage?.body ?? lead.email ?? lead.phone ?? "No messages yet"}
      </p>
      <Badge variant="outline" className="w-fit text-[10px]">
        {lead.status}
      </Badge>
    </button>
  );
}

function ReplyBox({ leadId }: { leadId: string }) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await replyToLead(leadId, {}, formData);
      if (result.error) {
        notify.error(result.error);
        return;
      }
      if (result.warning) {
        notify.error(result.warning);
      } else {
        notify.success("Reply sent");
      }
      setBody("");
    });
  }

  return (
    <form action={handleSubmit} className="flex items-end gap-2 border-t border-border p-3">
      <Textarea
        name="body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a reply..."
        rows={2}
        className="flex-1"
        required
      />
      <Button type="submit" size="icon" disabled={isPending || !body.trim()} aria-label="Send reply">
        <Send className="size-4" />
      </Button>
    </form>
  );
}

export function FacebookInbox({ leads, canManage }: { leads: FacebookLeadRow[]; canManage: boolean }) {
  const [selectedId, setSelectedId] = useState<string | undefined>(leads[0]?.id);
  const [isPending, startTransition] = useTransition();

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedId), [leads, selectedId]);

  function selectLead(lead: FacebookLeadRow) {
    setSelectedId(lead.id);
    if (canManage && unreadCount(lead) > 0) {
      startTransition(() => markLeadRead(lead.id));
    }
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <p className="text-sm text-muted-foreground">
          No Facebook messages or leads yet. They&apos;ll appear here once the webhook is connected.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 md:grid-cols-[280px_1fr]">
      <div className="flex max-h-[70vh] flex-col divide-y divide-border overflow-y-auto border-b border-border md:border-b-0 md:border-r">
        {leads.map((lead) => (
          <LeadRowButton
            key={lead.id}
            lead={lead}
            selected={lead.id === selectedId}
            onSelect={() => selectLead(lead)}
          />
        ))}
      </div>

      {selectedLead ? (
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <div>
              <p className="font-medium text-foreground">{selectedLead.name ?? "Unknown"}</p>
              <p className="text-xs text-muted-foreground">
                {selectedLead.email ?? selectedLead.phone ?? "No contact details"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canManage ? (
                <Select
                  value={selectedLead.status}
                  disabled={isPending}
                  onValueChange={(value) => {
                    startTransition(async () => {
                      await updateLeadStatus(selectedLead.id, value as (typeof STATUS_OPTIONS)[number]);
                      notify.success("Status updated");
                    });
                  }}
                >
                  <SelectTrigger size="sm" className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline">{selectedLead.status}</Badge>
              )}
              {selectedLead.customerId ? (
                <Link href={`/dashboard/customers/${selectedLead.customerId}`}>
                  <Badge variant="outline" className="hover:bg-secondary">
                    View Profile
                  </Badge>
                </Link>
              ) : (
                canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        await addFacebookLeadToCrm(selectedLead.id);
                        notify.success("Added to CRM");
                      });
                    }}
                  >
                    <UserPlus className="size-4" />
                    Add to CRM
                  </Button>
                )
              )}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {selectedLead.messages.length === 0 && (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            )}
            {selectedLead.messages.map((message) => (
              <div
                key={message.id}
                className={cn("max-w-[75%] rounded-lg p-3 text-sm", message.fromUserId ? "ml-auto bg-navy text-white" : "bg-secondary")}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p className={cn("mt-1 text-[11px]", message.fromUserId ? "text-white/70" : "text-muted-foreground")}>
                  {message.fromUserId ? message.fromUserName ?? "Staff" : "Customer"} ·{" "}
                  {formatDateTime(message.createdAt)}
                </p>
              </div>
            ))}
          </div>

          {canManage && <ReplyBox leadId={selectedLead.id} />}
        </div>
      ) : (
        <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
          Select a conversation
        </div>
      )}
    </div>
  );
}
