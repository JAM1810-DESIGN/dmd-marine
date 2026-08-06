import Link from "next/link";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import {
  Inbox,
  CalendarClock,
  FolderKanban,
  CheckCircle2,
  Users,
  MessageSquare,
  DollarSign,
  Receipt,
  TrendingUp,
  FileClock,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getRevenueTotal, getExpenseTotal, getCashFlow } from "@/lib/finance-calculations";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";

const LIVE_MODULES = [
  { title: "Bookings", href: "/dashboard/bookings" },
  { title: "Customer CRM", href: "/dashboard/customers" },
  { title: "Service Management", href: "/dashboard/services" },
  { title: "Projects", href: "/dashboard/projects" },
  { title: "Calendar", href: "/dashboard/calendar" },
  { title: "Messages", href: "/dashboard/messages" },
  { title: "Facebook", href: "/dashboard/facebook" },
  { title: "Finance", href: "/dashboard/finance" },
  { title: "Reports & Analytics", href: "/dashboard/reports" },
  { title: "Settings", href: "/dashboard/settings" },
];

const UPCOMING_MODULES: { title: string; phase: string }[] = [];

function currency(value: number) {
  return value.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
}

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
    { title: "New Inquiries", value: newInquiries, icon: Inbox, href: "/dashboard/bookings", tone: "primary" as const },
    { title: "Upcoming Bookings", value: upcomingBookings, icon: CalendarClock, href: "/dashboard/bookings", tone: "accent" as const },
    { title: "Active Projects", value: activeProjects, icon: FolderKanban, href: "/dashboard/projects", tone: "warning" as const },
    { title: "Completed Projects", value: completedProjects, icon: CheckCircle2, href: "/dashboard/projects", tone: "success" as const },
    { title: "Customers", value: customerCount, icon: Users, href: "/dashboard/customers", tone: "primary" as const },
    { title: "Unread Messages", value: unreadMessages, icon: MessageSquare, href: "/dashboard/messages", tone: "accent" as const },
  ];

  const canViewFinance =
    session?.user.role === "ADMIN" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "FINANCE_OFFICER";

  const financeWidgets = canViewFinance
    ? await (async () => {
        const today = { start: startOfDay(new Date()), end: endOfDay(new Date()) };
        const month = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
        const [todayRevenue, todayExpenses, monthlyRevenue, monthlyExpenses, cashFlow, pendingInvoices, overdueInvoices] =
          await Promise.all([
            getRevenueTotal(today),
            getExpenseTotal(today),
            getRevenueTotal(month),
            getExpenseTotal(month),
            getCashFlow(month),
            db.invoice.count({ where: { status: { in: ["DRAFT", "SENT", "PARTIAL"] } } }),
            db.invoice.count({ where: { status: "OVERDUE" } }),
          ]);
        return {
          todayRevenue,
          todayExpenses,
          monthlyProfit: monthlyRevenue - monthlyExpenses,
          pendingInvoices,
          overdueInvoices,
          cashFlow: cashFlow.net,
        };
      })()
    : null;

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
          <StatCard
            key={kpi.title}
            icon={kpi.icon}
            label={kpi.title}
            value={kpi.value}
            href={kpi.href}
            tone={kpi.tone}
          />
        ))}
      </div>

      {financeWidgets && (
        <div>
          <h2 className="mb-3 font-heading text-base font-semibold text-foreground">Finance Snapshot</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Today's Revenue", value: currency(financeWidgets.todayRevenue), icon: DollarSign, tone: "success" as const },
              { title: "Today's Expenses", value: currency(financeWidgets.todayExpenses), icon: Receipt, tone: "warning" as const },
              { title: "Monthly Profit", value: currency(financeWidgets.monthlyProfit), icon: TrendingUp, tone: "primary" as const },
              { title: "Pending Invoices", value: financeWidgets.pendingInvoices, icon: FileClock, tone: "accent" as const },
              { title: "Overdue Invoices", value: financeWidgets.overdueInvoices, icon: AlertTriangle, tone: "warning" as const },
              { title: "Cash Flow (this month)", value: currency(financeWidgets.cashFlow), icon: Wallet, tone: "primary" as const },
            ].map((widget) => (
              <StatCard
                key={widget.title}
                icon={widget.icon}
                label={widget.title}
                value={widget.value}
                href="/dashboard/finance"
                tone={widget.tone}
              />
            ))}
          </div>
        </div>
      )}

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
