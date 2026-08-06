"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { markNotificationRead, markAllNotificationsRead } from "@/app/dashboard/notifications-actions";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/generated/prisma/enums";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

const URGENCY_RANK = { critical: 2, warning: 1, normal: 0 } as const;
type Urgency = keyof typeof URGENCY_RANK;

const TYPE_URGENCY: Record<NotificationType, Urgency> = {
  INVOICE_OVERDUE: "critical",
  EXPENSE_PENDING_APPROVAL: "critical",
  APPOINTMENT_REMINDER: "warning",
  NEW_INQUIRY: "normal",
  NEW_BOOKING: "normal",
  FACEBOOK_MESSAGE: "normal",
  OTHER: "normal",
};

const URGENCY_DOT_CLASSES: Record<Urgency, string> = {
  critical: "bg-destructive",
  warning: "bg-warning",
  normal: "bg-primary",
};

const URGENCY_BADGE_CLASSES: Record<Urgency, string> = {
  critical: "bg-destructive text-white",
  warning: "bg-warning text-white",
  normal: "bg-primary text-primary-foreground",
};

const URGENCY_RING_CLASSES: Record<Urgency, string> = {
  critical: "bg-destructive/60",
  warning: "bg-warning/60",
  normal: "bg-primary/60",
};

function highestUrgency(notifications: NotificationItem[]): Urgency {
  let worst: Urgency = "normal";
  for (const n of notifications) {
    if (n.isRead) continue;
    const urgency = TYPE_URGENCY[n.type] ?? "normal";
    if (URGENCY_RANK[urgency] > URGENCY_RANK[worst]) worst = urgency;
  }
  return worst;
}

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const urgency = highestUrgency(notifications);

  function handleSelect(notification: NotificationItem) {
    if (!notification.isRead) {
      startTransition(() => {
        markNotificationRead(notification.id);
      });
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  function handleMarkAll() {
    startTransition(() => {
      markAllNotificationsRead();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <>
                <span
                  className={cn(
                    "notif-ping absolute -right-1 -top-1 size-5 rounded-full",
                    URGENCY_RING_CLASSES[urgency],
                  )}
                  aria-hidden
                />
                <Badge
                  className={cn(
                    "absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]",
                    URGENCY_BADGE_CLASSES[urgency],
                  )}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              </>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-1.5 py-1">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={isPending}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-1.5 py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleSelect(n)}
                className="flex-col items-start gap-0.5 whitespace-normal py-2"
              >
                <div className="flex items-center gap-2">
                  {!n.isRead && (
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        URGENCY_DOT_CLASSES[TYPE_URGENCY[n.type] ?? "normal"],
                      )}
                    />
                  )}
                  <span className="text-sm font-medium text-foreground">{n.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-[11px] text-muted-foreground/70">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
