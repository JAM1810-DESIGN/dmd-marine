"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  UserCog,
  Wrench,
  FolderKanban,
  Calendar,
  MessageSquare,
  Megaphone,
  Wallet,
  BarChart3,
  Settings,
  FileText,
} from "lucide-react";
import { LogoMark } from "@/components/shared/logo-mark";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  children?: { href: string; label: string }[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarClock, enabled: true },
  { href: "/dashboard/customers", label: "Customers", icon: Users, enabled: true },
  { href: "/dashboard/consultants", label: "Consultants", icon: UserCog, enabled: true },
  { href: "/dashboard/documents", label: "Documents & Forms", icon: FileText, enabled: true },
  { href: "/dashboard/services", label: "Services", icon: Wrench, enabled: true },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, enabled: true },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar, enabled: true },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, enabled: true },
  { href: "/dashboard/facebook", label: "Facebook", icon: Megaphone, enabled: true },
  {
    href: "/dashboard/finance",
    label: "Finance",
    icon: Wallet,
    enabled: true,
    children: [
      { href: "/dashboard/finance", label: "Dashboard" },
      { href: "/dashboard/finance/expenses", label: "Expenses" },
      { href: "/dashboard/finance/invoices", label: "Invoices" },
      { href: "/dashboard/finance/payments", label: "Payments" },
      { href: "/dashboard/finance/statements", label: "Financial Statements" },
      { href: "/dashboard/finance/reports", label: "Reports" },
      { href: "/dashboard/finance/budgets", label: "Budgets" },
      { href: "/dashboard/finance/settings", label: "Settings" },
    ],
  },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, enabled: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, enabled: true },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <LogoMark className="size-6 text-sidebar-primary" aria-hidden />
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
                className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/40"
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

          if (item.children) {
            const isSectionActive = pathname.startsWith(item.href);
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : isSectionActive
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
                {isSectionActive && (
                  <div className="mt-1 ml-4 flex flex-col space-y-0.5 border-l border-sidebar-border pl-3">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          className={cn(
                            "rounded-md px-2 py-1.5 text-sm transition-colors",
                            childActive
                              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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
