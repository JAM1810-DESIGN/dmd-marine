"use client";

import Link from "next/link";
import { Menu, LogOut, Plus, User as UserIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/shared/sidebar";
import { NotificationBell, type NotificationItem } from "@/components/shared/notification-bell";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LiveClock } from "@/components/shared/live-clock";
import { signOutAction } from "@/app/dashboard/actions";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
  FINANCE_OFFICER: "Finance Officer",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardTopbar({
  user,
  notifications,
  unreadCount,
}: {
  user: { name: string; email: string; role: string };
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-background px-4 shadow-sm sm:px-6">
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarNav />
        </SheetContent>
      </Sheet>

      <div className="hidden min-w-0 flex-col sm:flex">
        <span className="truncate text-sm font-medium text-foreground">
          {greeting()}, {user.name}
        </span>
        <LiveClock />
      </div>

      <div className="flex-1" />

      <Link
        href="/dashboard/bookings"
        className={buttonVariants({ size: "sm", className: "hidden sm:inline-flex" })}
      >
        <Plus className="size-4" />
        New Booking
      </Link>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
      </div>

      <div className="h-6 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden flex-col items-start sm:flex">
                <span className="font-medium text-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </span>
            </button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserIcon className="size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => signOutAction()}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
