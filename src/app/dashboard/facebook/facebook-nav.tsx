"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  MessageSquare,
  MessageCircle,
  Star,
  CalendarPlus,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";

const OVERVIEW_HREF = "/dashboard/facebook";

const ITEMS = [
  { href: "/dashboard/facebook", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/facebook/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/dashboard/facebook/comments", label: "Comments", icon: MessageCircle },
  { href: "/dashboard/facebook/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/facebook/requests", label: "Requests", icon: CalendarPlus },
  { href: "/dashboard/facebook/connection", label: "Connection", icon: Plug },
] as const;

export function FacebookNav() {
  const pathname = usePathname();

  return (
    <nav className="rounded-xl bg-card p-2 ring-1 ring-foreground/10">
      <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Facebook
      </p>
      <ul className="flex flex-col gap-0.5">
        {ITEMS.map((item) => {
          const active =
            item.href === OVERVIEW_HREF ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
