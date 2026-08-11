// src/app/dashboard/consultants/consultants-table.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, RotateCcw, List, LayoutGrid } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { rankSortIndex, CONSULTANT_RANKS } from "@/lib/consultant-ranks";
import { deactivateConsultant, reactivateConsultant } from "./actions";
import { ConsultantFormDialog, type ConsultantRecord } from "./consultant-form-dialog";

export type ConsultantRow = ConsultantRecord & {
  isActive: boolean;
  activeBookings: number;
  activeProjects: number;
  completedProjects: number;
  revenue: number;
};

type SortBy = "name" | "rank" | "load" | "revenue";
type ViewMode = "table" | "cards";

const php = (amount: number) =>
  amount.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

const phpCompact = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    notation: "compact",
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 1,
  }).format(amount);

const AVAILABILITY_META: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: "Available", className: "bg-success/15 text-success" },
  NOT_AVAILABLE: { label: "Not available", className: "bg-destructive/15 text-destructive" },
  ONBOARD: { label: "Onboard", className: "bg-ocean/15 text-ocean" },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-medium text-accent",
        size === "sm" ? "size-8 text-xs" : "size-11 text-sm",
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

function AvailabilityBadge({ availability }: { availability: string }) {
  const meta = AVAILABILITY_META[availability] ?? { label: availability, className: "bg-secondary" };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>
      {meta.label}
    </span>
  );
}

function WorkloadBar({ active, max }: { active: number; max: number }) {
  const tone = active >= max * 0.75 ? "bg-coral" : active >= max * 0.4 ? "bg-ocean" : "bg-success";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn("h-full rounded-full", tone)}
        style={{ width: `${Math.min(100, (active / max) * 100)}%` }}
      />
    </div>
  );
}

function ConsultantActions({
  consultant,
  currentUserId,
}: {
  consultant: ConsultantRow;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const isSelf = consultant.id === currentUserId;

  return (
    <div className="flex items-center gap-1">
      <ConsultantFormDialog
        consultant={consultant}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Edit consultant">
            <Pencil className="size-4" />
          </Button>
        }
      />
      {isSelf ? (
        <Badge variant="outline">You</Badge>
      ) : consultant.isActive ? (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Deactivate consultant">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          }
          title={`Deactivate ${consultant.name}?`}
          description="They'll no longer appear in consultant-assignment pickers. Their history stays intact, and you can restore them anytime."
          confirmLabel="Deactivate"
          variant="destructive"
          onConfirm={async () => {
            await deactivateConsultant(consultant.id);
            notify.success("Consultant deactivated");
          }}
        />
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Restore consultant"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await reactivateConsultant(consultant.id);
              notify.success("Consultant restored");
            })
          }
        >
          <RotateCcw className="size-4" />
        </Button>
      )}
    </div>
  );
}

function ConsultantCard({
  consultant,
  currentUserId,
  maxLoad,
}: {
  consultant: ConsultantRow;
  currentUserId: string;
  maxLoad: number;
}) {
  const subtitle = [consultant.rank, consultant.baseLocations[0]].filter(Boolean).join(" · ");
  const isSelf = consultant.id === currentUserId;

  return (
    <div
      className={cn(
        "flex flex-col gap-3.5 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 transition-colors",
        !consultant.isActive && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={consultant.name} />
          <div>
            <Link
              href={`/dashboard/consultants/${consultant.id}`}
              className="font-medium text-foreground hover:underline"
            >
              {consultant.name}
            </Link>
            {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
            <p className="text-xs text-muted-foreground">{subtitle || "No rank set"}</p>
          </div>
        </div>
        <AvailabilityBadge availability={consultant.availability} />
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Active workload</span>
          <span className="font-medium text-foreground">
            {consultant.activeBookings} {consultant.activeBookings === 1 ? "booking" : "bookings"}
          </span>
        </div>
        <WorkloadBar active={consultant.activeBookings} max={maxLoad} />
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Active</p>
          <p className="text-base font-medium tabular-nums">{consultant.activeProjects}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Done</p>
          <p className="text-base font-medium tabular-nums">{consultant.completedProjects}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Revenue</p>
          <p className="text-base font-medium tabular-nums text-success">{phpCompact(consultant.revenue)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <Badge variant={consultant.isActive ? "default" : "outline"}>
          {consultant.isActive ? "Active" : "Inactive"}
        </Badge>
        <ConsultantActions consultant={consultant} currentUserId={currentUserId} />
      </div>
    </div>
  );
}

export function ConsultantsTable({
  consultants,
  currentUserId,
}: {
  consultants: ConsultantRow[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [rankFilter, setRankFilter] = useState<string>("ALL");
  const [activeOnly, setActiveOnly] = useState(false);
  const [view, setView] = useState<ViewMode>("table");

  const maxLoad = useMemo(
    () => Math.max(1, ...consultants.map((c) => c.activeBookings)),
    [consultants],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = consultants.filter((consultant) => {
      if (activeOnly && !consultant.isActive) return false;
      if (rankFilter !== "ALL" && consultant.rank !== rankFilter) return false;
      if (query && !consultant.name.toLowerCase().includes(query)) return false;
      return true;
    });

    return [...rows].sort((a, b) => {
      if (sortBy === "rank") {
        const diff = rankSortIndex(a.rank) - rankSortIndex(b.rank);
        if (diff !== 0) return diff;
      } else if (sortBy === "load") {
        const diff = b.activeBookings - a.activeBookings;
        if (diff !== 0) return diff;
      } else if (sortBy === "revenue") {
        const diff = b.revenue - a.revenue;
        if (diff !== 0) return diff;
      }
      return a.name.localeCompare(b.name);
    });
  }, [consultants, search, sortBy, rankFilter, activeOnly]);

  return (
    <div className="rounded-xl border-t-[3px] border-t-teal-500 bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-base font-semibold">Consultants</h2>
            <p className="text-sm text-muted-foreground">
              Workload, performance, and profiles at a glance.
            </p>
          </div>
          <div className="flex items-center gap-2">
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
                variant={view === "cards" ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label="Card view"
                aria-pressed={view === "cards"}
                onClick={() => setView("cards")}
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
            <ConsultantFormDialog
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  New Consultant
                </Button>
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:w-48"
          />
          <Select value={rankFilter} onValueChange={(value) => setRankFilter(value ?? "ALL")}>
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All ranks</SelectItem>
              {CONSULTANT_RANKS.map((rank) => (
                <SelectItem key={rank} value={rank}>
                  {rank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="rank">Sort: Rank</SelectItem>
              <SelectItem value="load">Sort: Load</SelectItem>
              <SelectItem value="revenue">Sort: Revenue</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="active-only" checked={activeOnly} onCheckedChange={setActiveOnly} />
            <Label htmlFor="active-only" className="text-sm text-muted-foreground">
              Active only
            </Label>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="border-none"
          title="No consultants match your filters"
          description="Try a different name, rank, or status."
        />
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-3.5 p-4 pt-0 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((consultant) => (
            <ConsultantCard
              key={consultant.id}
              consultant={consultant}
              currentUserId={currentUserId}
              maxLoad={maxLoad}
            />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Active load</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((consultant) => (
              <TableRow key={consultant.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={consultant.name} size="sm" />
                    <div>
                      <Link
                        href={`/dashboard/consultants/${consultant.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {consultant.name}
                      </Link>
                      {consultant.id === currentUserId && (
                        <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {consultant.rank ?? "No rank"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="w-32">
                    <div className="mb-1 text-sm font-medium text-foreground">
                      {consultant.activeBookings}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {consultant.activeBookings === 1 ? "booking" : "bookings"}
                      </span>
                    </div>
                    <WorkloadBar active={consultant.activeBookings} max={maxLoad} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {consultant.activeProjects} active
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-sm tabular-nums">{consultant.completedProjects}</TableCell>
                <TableCell className="text-sm font-medium tabular-nums text-foreground">
                  {php(consultant.revenue)}
                </TableCell>
                <TableCell>
                  <AvailabilityBadge availability={consultant.availability} />
                </TableCell>
                <TableCell>
                  <Badge variant={consultant.isActive ? "default" : "outline"}>
                    {consultant.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ConsultantActions consultant={consultant} currentUserId={currentUserId} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
