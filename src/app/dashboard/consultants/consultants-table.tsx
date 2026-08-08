// src/app/dashboard/consultants/consultants-table.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
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

const php = (amount: number) =>
  amount.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

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
  const [isPending, startTransition] = useTransition();

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
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Consultants</h2>
          <p className="text-sm text-muted-foreground">
            Workload, performance, and profiles at a glance.
          </p>
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

      {filtered.length === 0 ? (
        <EmptyState
          className="border-none"
          title="No consultants match your filters"
          description="Try a different name, rank, or status."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Active load</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((consultant) => {
              const isSelf = consultant.id === currentUserId;
              return (
                <TableRow key={consultant.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/consultants/${consultant.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {consultant.name}
                    </Link>
                    {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                    <div className="text-xs text-muted-foreground">{consultant.email}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {consultant.rank ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="w-32">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium text-foreground">
                          {consultant.activeBookings}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {consultant.activeBookings === 1 ? "booking" : "bookings"}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-ocean"
                          style={{ width: `${(consultant.activeBookings / maxLoad) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {consultant.activeProjects} active{" "}
                        {consultant.activeProjects === 1 ? "project" : "projects"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{consultant.completedProjects}</TableCell>
                  <TableCell className="text-sm font-medium text-foreground">
                    {php(consultant.revenue)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={consultant.isActive ? "default" : "outline"}>
                      {consultant.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ConsultantFormDialog
                        key={consultant.id}
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
                            <Button variant="ghost" size="icon-sm" aria-label="Delete consultant">
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
