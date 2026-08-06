import { CollapsibleSidebar } from "@/components/shared/collapsible-sidebar";
import { DashboardTopbar } from "@/components/shared/dashboard-topbar";
import { AnimatedSky } from "@/components/shared/animated-sky";
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
    <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible">
      <AnimatedSky variant="subtle" />
      <CollapsibleSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print:hidden">
          <DashboardTopbar user={user} notifications={notifications} unreadCount={unreadCount} />
        </div>
        <main className="scrollbar-hide flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:overflow-visible print:p-0">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
