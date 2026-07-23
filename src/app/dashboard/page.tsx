import Link from "next/link";
import { Inbox, CalendarClock, FolderKanban, CheckCircle2, Users, MessageSquare } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LIVE_MODULES = [
  { title: "Bookings", href: "/dashboard/bookings" },
  { title: "Customer CRM", href: "/dashboard/customers" },
  { title: "Service Management", href: "/dashboard/services" },
  { title: "Projects", href: "/dashboard/projects" },
  { title: "Calendar", href: "/dashboard/calendar" },
  { title: "Messages", href: "/dashboard/messages" },
  { title: "Facebook", href: "/dashboard/facebook" },
  { title: "Settings", href: "/dashboard/settings" },
];

const UPCOMING_MODULES = [
  { title: "Finance", phase: "Phase 9" },
  { title: "Reports & Analytics", phase: "Phase 10" },
];

export default async function DashboardPage() {
  const session = await auth();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [newInquiries, upcomingBookings, activeProjects, completedProjects, customerCount, unreadMessages] =
    await Promise.all([
      db.booking.count({ where: { status: "NEW" } }),
      db.booking.count({
        where: { preferredDate: { gte: startOfToday }, status: { notIn: ["CANCELLED", "COMPLETED"] } },
      }),
      db.project.count({ where: { status: "ACTIVE" } }),
      db.project.count({ where: { status: "COMPLETED" } }),
      db.customer.count(),
      session?.user
        ? db.message.count({ where: { toUserId: session.user.id, isRead: false } })
        : Promise.resolve(0),
    ]);

  const kpis = [
    { title: "New Inquiries", value: newInquiries, icon: Inbox, href: "/dashboard/bookings" },
    { title: "Upcoming Bookings", value: upcomingBookings, icon: CalendarClock, href: "/dashboard/bookings" },
    { title: "Active Projects", value: activeProjects, icon: FolderKanban, href: "/dashboard/projects" },
    { title: "Completed Projects", value: completedProjects, icon: CheckCircle2, href: "/dashboard/projects" },
    { title: "Customers", value: customerCount, icon: Users, href: "/dashboard/customers" },
    { title: "Unread Messages", value: unreadMessages, icon: MessageSquare, href: "/dashboard/messages" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back, {session?.user?.name}
        </h1>
        <p className="text-sm text-muted-foreground">Signed in as {session?.user?.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <Link key={kpi.title} href={kpi.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <div>
                  <CardDescription>{kpi.title}</CardDescription>
                  <CardTitle className="text-3xl font-semibold">{kpi.value}</CardTitle>
                </div>
                <kpi.icon className="size-8 shrink-0 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-3 font-heading text-base font-semibold text-foreground">Modules</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LIVE_MODULES.map((module) => (
            <Link key={module.title} href={module.href}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <CardDescription>Open module</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
          {UPCOMING_MODULES.map((module) => (
            <Card key={module.title} className="opacity-70">
              <CardHeader>
                <CardTitle className="text-base">{module.title}</CardTitle>
                <CardDescription>Not yet available</CardDescription>
                <CardAction>
                  <Badge variant="outline">{module.phase}</Badge>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
