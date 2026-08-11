import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from "date-fns";
import Link from "next/link";
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
  UserCheck,
  UserPlus,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  getRevenueTotal,
  getExpenseTotal,
  getCashFlow,
  getMonthlySeries,
} from "@/lib/finance-calculations";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { RevenueTrendChart } from "./dashboard-charts";

function currency(value: number) {
  return value.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
}

const UNASSIGNED_STATUSES = ["NEW", "REVIEWING", "SCHEDULED"] as const;

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user.id;
  const role = session?.user.role;
  const isStaff = role === "STAFF";
  const canViewFinance = role === "ADMIN" || role === "MANAGER" || role === "FINANCE_OFFICER";
  const canManageDocs = role === "ADMIN" || role === "MANAGER";

  const startOfToday = startOfDay(new Date());
  const endOfToday = endOfDay(new Date());
  const in30Days = new Date(endOfToday.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    newInquiries,
    upcomingBookings,
    activeProjects,
    completedProjects,
    customerCount,
    unreadMessages,
    unassignedBookings,
    overdueAgg,
    myAssignedBookings,
    myActiveProjects,
    todaySchedules,
    expiringDocs,
  ] = await Promise.all([
    db.booking.count({ where: { status: "NEW" } }),
    db.booking.count({
      where: { preferredDate: { gte: startOfToday }, status: { notIn: ["CANCELLED", "COMPLETED"] } },
    }),
    db.project.count({ where: { status: "ACTIVE" } }),
    db.project.count({ where: { status: "COMPLETED" } }),
    db.customer.count(),
    userId ? db.message.count({ where: { toUserId: userId, isRead: false } }) : Promise.resolve(0),
    db.booking.count({
      where: { assignedConsultantId: null, status: { in: [...UNASSIGNED_STATUSES] } },
    }),
    db.invoice.aggregate({
      where: { status: "OVERDUE" },
      _count: true,
      _sum: { totalAmount: true },
    }),
    isStaff && userId
      ? db.booking.count({
          where: { assignedConsultantId: userId, status: { notIn: ["CANCELLED", "COMPLETED"] } },
        })
      : Promise.resolve(0),
    isStaff && userId
      ? db.project.count({ where: { consultantId: userId, status: "ACTIVE" } })
      : Promise.resolve(0),
    db.schedule.findMany({
      where: {
        startAt: { gte: startOfToday, lte: endOfToday },
        ...(isStaff && userId ? { consultantId: userId } : {}),
      },
      orderBy: { startAt: "asc" },
      include: { consultant: { select: { name: true } } },
    }),
    canManageDocs
      ? db.companyDocument.count({ where: { expiresAt: { not: null, lte: in30Days } } })
      : Promise.resolve(0),
  ]);

  const overdueCount = overdueAgg._count;
  const overdueTotal = Number(overdueAgg._sum.totalAmount ?? 0);

  const kpis = isStaff
    ? [
        { title: "My Assigned Bookings", value: myAssignedBookings, icon: UserCheck, href: "/dashboard/bookings", tone: "primary" as const, subtitle: "Active work", emptyLabel: "Nothing assigned" },
        { title: "My Active Projects", value: myActiveProjects, icon: FolderKanban, href: "/dashboard/projects", tone: "primary" as const, subtitle: "In progress", emptyLabel: "No active projects" },
        { title: "Upcoming Bookings", value: upcomingBookings, icon: CalendarClock, href: "/dashboard/bookings", tone: "info" as const, subtitle: "From today onward", emptyLabel: "Nothing scheduled" },
        { title: "New Inquiries", value: newInquiries, icon: Inbox, href: "/dashboard/bookings?status=NEW", tone: "info" as const, subtitle: "Awaiting review", emptyLabel: "No new inquiries" },
        { title: "Customers", value: customerCount, icon: Users, href: "/dashboard/customers", tone: "primary" as const, subtitle: "In your CRM", emptyLabel: "No customers yet" },
        { title: "Unread Messages", value: unreadMessages, icon: MessageSquare, href: "/dashboard/messages", tone: "info" as const, subtitle: "Waiting on a reply", emptyLabel: "Inbox zero" },
      ]
    : [
        { title: "New Inquiries", value: newInquiries, icon: Inbox, href: "/dashboard/bookings?status=NEW", tone: "info" as const, subtitle: "Awaiting review", emptyLabel: "No new inquiries" },
        { title: "Upcoming Bookings", value: upcomingBookings, icon: CalendarClock, href: "/dashboard/bookings", tone: "primary" as const, subtitle: "From today onward", emptyLabel: "Nothing scheduled" },
        { title: "Active Projects", value: activeProjects, icon: FolderKanban, href: "/dashboard/projects", tone: "primary" as const, subtitle: "In progress", emptyLabel: "No active projects" },
        { title: "Completed Projects", value: completedProjects, icon: CheckCircle2, href: "/dashboard/projects", tone: "success" as const, subtitle: "All time", emptyLabel: "None completed yet" },
        { title: "Customers", value: customerCount, icon: Users, href: "/dashboard/customers", tone: "primary" as const, subtitle: "In your CRM", emptyLabel: "No customers yet" },
        { title: "Unread Messages", value: unreadMessages, icon: MessageSquare, href: "/dashboard/messages", tone: "info" as const, subtitle: "Waiting on a reply", emptyLabel: "Inbox zero" },
      ];

  const attention: {
    key: string;
    label: string;
    href: string;
    icon: typeof Inbox;
    tone: string;
  }[] = [];
  if (newInquiries > 0) {
    attention.push({ key: "inquiries", label: `${newInquiries} new ${newInquiries === 1 ? "inquiry" : "inquiries"} to review`, href: "/dashboard/bookings?status=NEW", icon: Inbox, tone: "text-info" });
  }
  if (unassignedBookings > 0) {
    attention.push({ key: "unassigned", label: `${unassignedBookings} ${unassignedBookings === 1 ? "booking" : "bookings"} unassigned`, href: "/dashboard/bookings", icon: UserPlus, tone: "text-muted-foreground" });
  }
  if (canViewFinance && overdueCount > 0) {
    attention.push({ key: "overdue", label: `${overdueCount} overdue ${overdueCount === 1 ? "invoice" : "invoices"} · ${currency(overdueTotal)}`, href: "/dashboard/finance/invoices", icon: Receipt, tone: "text-destructive" });
  }
  if (canManageDocs && expiringDocs > 0) {
    attention.push({ key: "docs", label: `${expiringDocs} ${expiringDocs === 1 ? "document expiring" : "documents expiring"} or expired`, href: "/dashboard/documents", icon: FileClock, tone: "text-accent" });
  }

  const financeWidgets = canViewFinance
    ? await (async () => {
        const today = { start: startOfToday, end: endOfToday };
        const month = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
        const [todayRevenue, todayExpenses, monthlyRevenue, monthlyExpenses, cashFlow, pendingInvoices, series] =
          await Promise.all([
            getRevenueTotal(today),
            getExpenseTotal(today),
            getRevenueTotal(month),
            getExpenseTotal(month),
            getCashFlow(month),
            db.invoice.count({ where: { status: { in: ["DRAFT", "SENT", "PARTIAL"] } } }),
            getMonthlySeries(6),
          ]);
        return {
          todayRevenue,
          todayExpenses,
          monthlyProfit: monthlyRevenue - monthlyExpenses,
          pendingInvoices,
          cashFlow: cashFlow.net,
          series,
        };
      })()
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="relative">
        <div className="pointer-events-none absolute -top-10 left-[8%] size-56 rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute top-10 right-[5%] size-48 rounded-full bg-accent/[0.10] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-[40%] size-40 rounded-full bg-info/[0.08] blur-3xl" />
        <div className="dash-stagger relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border-t-[3px] border-t-blue-500 bg-card ring-1 ring-foreground/10">
          <div className="flex items-center gap-2 p-4">
            <AlertTriangle className="size-4 text-accent" />
            <h2 className="font-heading text-base font-semibold">Needs attention</h2>
          </div>
          {attention.length === 0 ? (
            <EmptyState className="border-none" title="All clear" description="No items need your attention right now." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {attention.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-secondary/40"
                  >
                    <span className="flex items-center gap-2 text-foreground">
                      <item.icon className={`size-4 ${item.tone}`} />
                      {item.label}
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border-t-[3px] border-t-blue-500 bg-card ring-1 ring-foreground/10">
          <div className="flex items-center gap-2 p-4">
            <CalendarDays className="size-4 text-info" />
            <h2 className="font-heading text-base font-semibold">Today&apos;s schedule</h2>
          </div>
          {todaySchedules.length === 0 ? (
            <EmptyState className="border-none" title="Nothing today" description="No appointments scheduled for today." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {todaySchedules.map((schedule) => (
                <li key={schedule.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <span className="w-14 shrink-0 text-muted-foreground">{format(schedule.startAt, "HH:mm")}</span>
                  <div>
                    <p className="font-medium text-foreground">{schedule.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {schedule.consultant.name}
                      {" · "}
                      {schedule.type.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {financeWidgets && (
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-4 text-accent" />
            <h2 className="font-heading text-base font-semibold">Revenue vs expenses — last 6 months</h2>
          </div>
          <RevenueTrendChart data={financeWidgets.series} />
        </div>
      )}

      {financeWidgets && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-[#0b2545] p-6 sm:p-8">
          <div className="pointer-events-none absolute -bottom-16 right-[10%] size-64 rounded-full bg-sidebar-primary/[0.12] blur-3xl" />
          <h2 className="relative mb-4 font-heading text-lg font-semibold tracking-tight text-white">
            Finance Snapshot
          </h2>
          <div className="dash-stagger relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Today's Revenue", value: currency(financeWidgets.todayRevenue), icon: DollarSign, tone: "accent" as const, subtitle: "So far today" },
              { title: "Today's Expenses", value: currency(financeWidgets.todayExpenses), icon: Receipt, tone: "primary" as const, subtitle: "So far today" },
              { title: "Monthly Profit", value: currency(financeWidgets.monthlyProfit), icon: TrendingUp, tone: "accent" as const, subtitle: "This month" },
              { title: "Pending Invoices", value: financeWidgets.pendingInvoices, icon: FileClock, tone: "info" as const, subtitle: "Awaiting payment", emptyLabel: "All caught up" },
              { title: "Overdue Invoices", value: overdueCount, icon: AlertTriangle, tone: "primary" as const, subtitle: "Needs follow-up", emptyLabel: "Nothing overdue" },
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
                dark
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
