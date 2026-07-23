"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  LayoutDashboard,
  CalendarClock,
  Users,
  Wrench,
  FolderKanban,
  Calendar,
  MessageSquare,
  Megaphone,
  Wallet,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarClock, enabled: true },
  { href: "/dashboard/customers", label: "Customers", icon: Users, enabled: true },
  { href: "/dashboard/services", label: "Services", icon: Wrench, enabled: true },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, enabled: true },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar, enabled: true },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, enabled: true },
  { href: "/dashboard/facebook", label: "Facebook", icon: Megaphone, enabled: false },
  { href: "/dashboard/finance", label: "Finance", icon: Wallet, enabled: false },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, enabled: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, enabled: true },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <Anchor className="size-6 text-sidebar-primary" aria-hidden />
        <span className="font-heading text-sm font-semibold tracking-tight">
          DMD Marine
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-sidebar-foreground/40"
                aria-disabled
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                <Badge
                  variant="outline"
                  className="border-sidebar-border text-[10px] text-sidebar-foreground/40"
                >
                  Soon
                </Badge>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
