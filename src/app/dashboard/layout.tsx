import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DashboardLayout } from "@/components/shared/dashboard-layout";
import { refreshAppointmentReminders } from "@/lib/notifications";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  await refreshAppointmentReminders();

  const userId = session.user.id;
  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { OR: [{ userId: null }, { userId }] },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.notification.count({
      where: { isRead: false, OR: [{ userId: null }, { userId }] },
    }),
  ]);

  return (
    <DashboardLayout
      user={{
        name: session.user.name ?? "Unknown",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      notifications={notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }))}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardLayout>
  );
}
