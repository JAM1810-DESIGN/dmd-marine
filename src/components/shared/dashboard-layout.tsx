import { SidebarNav } from "@/components/shared/sidebar";
import { DashboardTopbar } from "@/components/shared/dashboard-topbar";
import type { NotificationItem } from "@/components/shared/notification-bell";

export function DashboardLayout({
  user,
  notifications,
  unreadCount,
  children,
}: {
  user: { name: string; email: string; role: string };
  notifications: NotificationItem[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 print:hidden md:block">
        <div className="fixed h-screen w-64">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <DashboardTopbar user={user} notifications={notifications} unreadCount={unreadCount} />
        </div>
        <main className="flex-1 p-4 sm:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
