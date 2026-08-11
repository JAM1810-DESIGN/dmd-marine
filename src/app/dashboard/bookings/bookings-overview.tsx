import { CalendarClock, Inbox, PlayCircle, CircleCheck, UserX } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";

const STATUS_META: Record<string, { label: string; color: string }> = {
  NEW: { label: "New", color: "#888780" },
  REVIEWING: { label: "Reviewing", color: "#EF9F27" },
  SCHEDULED: { label: "Scheduled", color: "#378ADD" },
  IN_PROGRESS: { label: "In progress", color: "#534AB7" },
  COMPLETED: { label: "Completed", color: "#1D9E75" },
  CANCELLED: { label: "Cancelled", color: "#A32D2D" },
};
const STATUS_ORDER = ["NEW", "REVIEWING", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export function BookingsOverview({
  total,
  active,
  completed,
  newCount,
  unassigned,
  statusCounts,
}: {
  total: number;
  active: number;
  completed: number;
  newCount: number;
  unassigned: number;
  statusCounts: Record<string, number>;
}) {
  const distTotal = STATUS_ORDER.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarClock} tone="primary" label="Total bookings" value={total} subtitle="all time" />
        <StatCard icon={Inbox} tone="info" label="New to review" value={newCount} subtitle="awaiting triage" />
        <StatCard icon={PlayCircle} tone="accent" label="Active" value={active} subtitle="scheduled or in progress" />
        <StatCard icon={CircleCheck} tone="success" label="Completed" value={completed} subtitle="delivered" />
      </div>

      {unassigned > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-300/60 bg-blue-100/60 px-4 py-3 dark:border-blue-500/30 dark:bg-blue-500/10">
          <UserX className="size-5 shrink-0 text-blue-700 dark:text-blue-300" />
          <span className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-semibold">
              {unassigned} booking{unassigned === 1 ? "" : "s"} unassigned
            </span>{" "}
            — no consultant assigned yet
          </span>
        </div>
      )}

      {distTotal > 0 && (
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="mb-3 font-heading text-base font-semibold">Status distribution</h2>
          <div className="mb-3 flex h-3.5 overflow-hidden rounded">
            {STATUS_ORDER.map((s) => {
              const count = statusCounts[s] ?? 0;
              if (count === 0) return null;
              return (
                <div key={s} style={{ width: `${(count / distTotal) * 100}%`, backgroundColor: STATUS_META[s].color }} />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
            {STATUS_ORDER.map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-sm" style={{ backgroundColor: STATUS_META[s].color }} />
                {STATUS_META[s].label} {statusCounts[s] ?? 0}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
