import { SidebarNav } from "@/components/shared/sidebar";
import { DashboardTopbar } from "@/components/shared/dashboard-topbar";

export function DashboardLayout({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
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
          <DashboardTopbar user={user} />
        </div>
        <main className="flex-1 p-4 sm:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
