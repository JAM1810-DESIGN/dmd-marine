"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, List, LayoutGrid } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { updateProjectStatus } from "./actions";
import { ProjectFormDialog, type ConsultantOption } from "./project-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";

const STATUS_OPTIONS = ["NEW", "PLANNING", "SCHEDULED", "ACTIVE", "COMPLETED", "CLOSED"] as const;
type Status = (typeof STATUS_OPTIONS)[number];
type ViewMode = "table" | "board";

export type ProjectRow = {
  id: string;
  name: string;
  customerId: string | null;
  customerName: string | null;
  vesselId: string | null;
  serviceId: string | null;
  consultantId: string;
  consultantName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  location: string | null;
  formsTotal: number;
  formsCompleted: number;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function progressPct(project: ProjectRow) {
  return project.formsTotal > 0 ? Math.round((project.formsCompleted / project.formsTotal) * 100) : null;
}

function ProgressBar({ project }: { project: ProjectRow }) {
  const pct = progressPct(project);
  if (pct === null) {
    return <span className="text-xs text-muted-foreground">No forms</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", pct === 100 ? "bg-success" : "bg-ocean")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

function dueFlag(project: ProjectRow) {
  const isClosed = project.status === "COMPLETED" || project.status === "CLOSED";
  const now = new Date();
  if (project.endDate) {
    const end = new Date(project.endDate);
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (!isClosed && days < 0) return { label: "Overdue", className: "text-destructive" };
    if (!isClosed && days <= 7)
      return { label: `Due ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, className: "text-amber-600 dark:text-amber-400" };
    return { label: `Ends ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, className: "text-muted-foreground" };
  }
  if (project.startDate && new Date(project.startDate) > now) {
    return {
      label: `Starts ${new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      className: "text-muted-foreground",
    };
  }
  return null;
}

function StatusSelect({ id, status, canManage }: { id: string; status: string; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (!canManage) {
    return <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>;
  }

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          await updateProjectStatus(id, value as Status);
          notify.success("Status updated");
        });
      }}
    >
      <SelectTrigger size="sm" className="w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BoardCard({ project, canManage }: { project: ProjectRow; canManage: boolean }) {
  const flag = dueFlag(project);
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
      <Link href={`/dashboard/projects/${project.id}`} className="font-medium text-foreground hover:underline">
        {project.name}
      </Link>
      <p className="text-xs text-muted-foreground">{project.customerName ?? "No customer"}</p>
      <ProgressBar project={project} />
      <div className="flex items-center justify-between pt-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="flex size-5 items-center justify-center rounded-full bg-accent/15 text-[9px] font-medium text-accent">
            {initials(project.consultantName)}
          </span>
          {project.consultantName}
        </span>
        {flag && <span className={cn("text-xs", flag.className)}>{flag.label}</span>}
      </div>
      {canManage && (
        <div className="pt-1">
          <StatusSelect id={project.id} status={project.status} canManage={canManage} />
        </div>
      )}
    </div>
  );
}

export function ProjectsTable({
  projects,
  customers,
  vessels,
  services,
  consultants,
  canManage,
}: {
  projects: ProjectRow[];
  customers: { id: string; name: string }[];
  vessels: { id: string; name: string }[];
  services: { id: string; name: string }[];
  consultants: ConsultantOption[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [view, setView] = useState<ViewMode>("table");
  const [dialog, setDialog] = useState<{ open: boolean; project?: ProjectRow }>({ open: false });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter !== "ALL" && project.status !== statusFilter) return false;
      if (!query) return true;
      return (
        project.name.toLowerCase().includes(query) ||
        (project.customerName ?? "").toLowerCase().includes(query)
      );
    });
  }, [projects, search, statusFilter]);

  const byStatus = useMemo(() => {
    const map = new Map<Status, ProjectRow[]>();
    for (const status of STATUS_OPTIONS) map.set(status, []);
    for (const project of filtered) {
      const list = map.get(project.status as Status);
      if (list) list.push(project);
    }
    return map;
  }, [filtered]);

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Projects</h2>
          <p className="text-sm text-muted-foreground">Track engagements from kickoff to closure.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name, customer..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:w-56"
          />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "ALL")}>
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-md border border-border p-0.5">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Table view"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={view === "board" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Board view"
              aria-pressed={view === "board"}
              onClick={() => setView("board")}
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setDialog({ open: true, project: undefined })}>
              <Plus className="size-4" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState className="border-none" title="No projects match your filters" description="Try adjusting your search or status filter." />
      ) : view === "board" ? (
        <div className="overflow-x-auto p-4 pt-0">
          <div className="grid grid-flow-col auto-cols-[220px] gap-3">
            {STATUS_OPTIONS.map((status) => {
              const items = byStatus.get(status) ?? [];
              return (
                <div key={status} className="flex flex-col gap-2.5 rounded-xl bg-secondary/40 p-2.5">
                  <div className="flex items-center justify-between px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>{status.replace(/_/g, " ")}</span>
                    <span className="rounded-full bg-card px-2 py-0.5 text-[11px]">{items.length}</span>
                  </div>
                  {items.map((project) => (
                    <BoardCard key={project.id} project={project} canManage={canManage} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Consultant</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timeline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((project) => {
              const flag = dueFlag(project);
              return (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {project.customerName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{project.consultantName}</TableCell>
                  <TableCell>
                    <ProgressBar project={project} />
                  </TableCell>
                  <TableCell>
                    <StatusSelect id={project.id} status={project.status} canManage={canManage} />
                  </TableCell>
                  <TableCell className="text-xs">
                    {flag ? (
                      <span className={flag.className}>{flag.label}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <ProjectFormDialog
        key={dialog.project?.id ?? "new"}
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        project={dialog.project}
        customers={customers}
        vessels={vessels}
        services={services}
        consultants={consultants}
      />
    </div>
  );
}
