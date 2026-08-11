"use client";

import { useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { toggleBranchActive } from "./actions";
import { BranchFormDialog } from "./branch-form-dialog";

type BranchRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
};

function ActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          await toggleBranchActive(id, checked);
          notify.success(checked ? "Branch activated" : "Branch deactivated");
        });
      }}
    />
  );
}

export function BranchesTable({ branches, canManage }: { branches: BranchRow[]; canManage: boolean }) {
  return (
    <div className="rounded-xl border-t-[3px] border-t-neutral-400 bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="font-heading text-base font-semibold">Branches</h2>
          <p className="text-sm text-muted-foreground">Locations used to scope bookings, projects, and finances.</p>
        </div>
        {canManage && (
          <BranchFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                New Branch
              </Button>
            }
          />
        )}
      </div>

      {branches.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No branches yet — all records are treated as unassigned.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((branch) => (
              <TableRow key={branch.id}>
                <TableCell className="font-medium text-foreground">{branch.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {branch.email ?? branch.phone ?? "—"}
                </TableCell>
                <TableCell>
                  {canManage ? (
                    <ActiveToggle id={branch.id} isActive={branch.isActive} />
                  ) : (
                    <Badge variant={branch.isActive ? "default" : "outline"}>
                      {branch.isActive ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canManage && (
                    <BranchFormDialog
                      branch={branch}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Edit branch">
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
