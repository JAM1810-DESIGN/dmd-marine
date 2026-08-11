import { Briefcase, PlayCircle, CircleCheck, ClipboardList, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";

const STATUS_META: Record<string, { label: string; color: string }> = {
  NEW: { label: "New", color: "#888780" },
  PLANNING: { label: "Planning", color: "#EF9F27" },
  SCHEDULED: { label: "Scheduled", color: "#378ADD" },
  ACTIVE: { label: "Active", color: "#534AB7" },
  COMPLETED: { label: "Completed", color: "#1D9E75" },
  CLOSED: { label: "Closed", color: "#5F5E5A" },
};
const STATUS_ORDER = ["NEW", "PLANNING", "SCHEDULED", "ACTIVE", "COMPLETED", "CLOSED"] as const;

export function ProjectsOverview({
  total,
  active,
  completed,
  formsPct,
  attention,
  statusCounts,
}: {
  total: number;
  active: number;
  completed: number;
  formsPct: number | null;
  attention: number;
  statusCounts: Record<string, number>;
}) {
  const distTotal = STATUS_ORDER.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} tone="primary" label="Total projects" value={total} subtitle="across all consultants" />
        <StatCard icon={PlayCircle} tone="accent" label="Active" value={active} subtitle="in progress" />
        <StatCard icon={CircleCheck} tone="success" label="Completed" value={completed} subtitle="completed or closed" />
        <StatCard
          icon={ClipboardList}
          tone="info"
          label="Forms complete"
          value={formsPct === null ? "—" : `${formsPct}%`}
          subtitle="across all projects"
        />
      </div>

      {attention > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-100/60 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <AlertTriangle className="size-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">
              {attention} project{attention === 1 ? "" : "s"} need attention
            </span>{" "}
            — past the end date and not completed
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
