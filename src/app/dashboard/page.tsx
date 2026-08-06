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
  Plus,
} from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getRevenueTotal, getExpenseTotal, getCashFlow } from "@/lib/finance-calculations";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { LiveClock } from "@/components/shared/live-clock";

function currency(value: number) {
  return value.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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
    {
      title: "New Inquiries",
      value: newInquiries,
      icon: Inbox,
      href: "/dashboard/bookings",
      tone: "info" as const,
      subtitle: "Awaiting review",
      emptyLabel: "No new inquiries",
    },
    {
      title: "Upcoming Bookings",
      value: upcomingBookings,
      icon: CalendarClock,
      href: "/dashboard/bookings",
      tone: "primary" as const,
      subtitle: "From today onward",
      emptyLabel: "Nothing scheduled",
    },
    {
      title: "Active Projects",
      value: activeProjects,
      icon: FolderKanban,
      href: "/dashboard/projects",
      tone: "primary" as const,
      subtitle: "In progress",
      emptyLabel: "No active projects",
    },
    {
      title: "Completed Projects",
      value: completedProjects,
      icon: CheckCircle2,
      href: "/dashboard/projects",
      tone: "success" as const,
      subtitle: "All time",
      emptyLabel: "None completed yet",
    },
    {
      title: "Customers",
      value: customerCount,
      icon: Users,
      href: "/dashboard/customers",
      tone: "primary" as const,
      subtitle: "In your CRM",
      emptyLabel: "No customers yet",
    },
    {
      title: "Unread Messages",
      value: unreadMessages,
      icon: MessageSquare,
      href: "/dashboard/messages",
      tone: "info" as const,
      subtitle: "Waiting on a reply",
      emptyLabel: "Inbox zero",
    },
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
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/[0.06] via-card to-card p-6 ring-1 ring-foreground/[0.06] sm:p-8">
        <div className="pointer-events-none absolute -top-24 right-0 size-64 rounded-full bg-primary/[0.05] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary">{greeting()}</p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {session?.user?.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-1">
              <LiveClock />
            </div>
          </div>
          <Link
            href="/dashboard/bookings"
            className={buttonVariants({ className: "self-start sm:self-end" })}
          >
            <Plus className="size-4" />
            New Booking
          </Link>
        </div>
      </div>

      <div className="dash-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.title}
            icon={kpi.icon}
            label={kpi.title}
            value={kpi.value}
            href={kpi.href}
            tone={kpi.tone}
            subtitle={kpi.subtitle}
            emptyLabel={kpi.emptyLabel}
          />
        ))}
      </div>

      {financeWidgets && (
        <div>
          <h2 className="mb-4 font-heading text-lg font-semibold tracking-tight text-foreground">Finance Snapshot</h2>
          <div className="dash-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Today's Revenue", value: currency(financeWidgets.todayRevenue), icon: DollarSign, tone: "accent" as const, subtitle: "So far today" },
              { title: "Today's Expenses", value: currency(financeWidgets.todayExpenses), icon: Receipt, tone: "primary" as const, subtitle: "So far today" },
              { title: "Monthly Profit", value: currency(financeWidgets.monthlyProfit), icon: TrendingUp, tone: "accent" as const, subtitle: "This month" },
              { title: "Pending Invoices", value: financeWidgets.pendingInvoices, icon: FileClock, tone: "info" as const, subtitle: "Awaiting payment", emptyLabel: "All caught up" },
              { title: "Overdue Invoices", value: financeWidgets.overdueInvoices, icon: AlertTriangle, tone: "primary" as const, subtitle: "Needs follow-up", emptyLabel: "Nothing overdue" },
              { title: "Cash Flow (this month)", value: currency(financeWidgets.cashFlow), icon: Wallet, tone: "accent" as const, subtitle: "Net this month" },
            ].map((widget) => (
              <StatCard
                key={widget.title}
                icon={widget.icon}
                label={widget.title}
                value={widget.value}
                href="/dashboard/finance"
                tone={widget.tone}
                subtitle={widget.subtitle}
                emptyLabel={"emptyLabel" in widget ? widget.emptyLabel : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
