// src/app/dashboard/consultants/consultants-table.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
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
import { rankSortIndex } from "@/lib/consultant-ranks";
import { deactivateConsultant, reactivateConsultant } from "./actions";
import { ConsultantFormDialog, type ConsultantRecord } from "./consultant-form-dialog";

export type ConsultantRow = ConsultantRecord & { isActive: boolean };

type SortBy = "name" | "rank";

export function ConsultantsTable({
  consultants,
  currentUserId,
}: {
  consultants: ConsultantRow[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = query
      ? consultants.filter((consultant) => consultant.name.toLowerCase().includes(query))
      : consultants;

    return [...rows].sort((a, b) => {
      if (sortBy === "rank") {
        const diff = rankSortIndex(a.rank) - rankSortIndex(b.rank);
        if (diff !== 0) return diff;
      }
      return a.name.localeCompare(b.name);
    });
  }, [consultants, search, sortBy]);

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Consultants</h2>
          <p className="text-sm text-muted-foreground">
            Manage consultant profiles, rank, and vessel experience.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:w-56"
          />
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="rank">Sort: Rank</SelectItem>
            </SelectContent>
          </Select>
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
          title="No consultants match your search"
          description="Try a different name."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Vessel Experience</TableHead>
              <TableHead>Phone</TableHead>
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
                  <div className="font-medium text-foreground">
                    {consultant.name}
                    {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{consultant.email}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {consultant.rank ?? "—"}
                </TableCell>
                <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                  {consultant.vesselExperience ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {consultant.phone ?? "—"}
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
