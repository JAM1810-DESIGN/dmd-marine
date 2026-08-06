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
  groupStart?: string;
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
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, enabled: true, groupStart: "System" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, enabled: true },
];

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex h-16 items-center gap-2 border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <LogoMark className="size-6 shrink-0 text-sidebar-primary" aria-hidden />
        {!collapsed && (
          <span className="font-heading text-sm font-semibold tracking-tight">
            DMD Marine
          </span>
        )}
      </div>

      <nav className="scrollbar-hide flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          const groupDivider = item.groupStart && (
            <div
              key={`${item.href}-group`}
              className={cn("mt-3 mb-1 border-t border-sidebar-border pt-3", collapsed && "mx-1")}
            >
              {!collapsed && (
                <p className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-sidebar-foreground/40 uppercase">
                  {item.groupStart}
                </p>
              )}
            </div>
          );

          if (!item.enabled) {
            return (
              <div key={item.href}>
                {groupDivider}
                <div
                  title={collapsed ? `${item.label} (Soon)` : undefined}
                  className={cn(
                    "flex cursor-not-allowed items-center rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/40",
                    collapsed ? "justify-center px-0" : "justify-between",
                  )}
                  aria-disabled
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && item.label}
                  </span>
                  {!collapsed && (
                    <Badge
                      variant="outline"
                      className="border-sidebar-border text-[10px] text-sidebar-foreground/40"
                    >
                      Soon
                    </Badge>
                  )}
                </div>
              </div>
            );
          }

          if (item.children) {
            const isSectionActive = pathname.startsWith(item.href);
            return (
              <div key={item.href}>
                {groupDivider}
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors duration-200",
                    collapsed ? "justify-center px-0" : "px-3",
                    isActive
                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      : isSectionActive
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && item.label}
                </Link>
                {!collapsed && isSectionActive && (
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
            <div key={item.href}>
              {groupDivider}
              <Link
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "px-3",
                  isActive
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
