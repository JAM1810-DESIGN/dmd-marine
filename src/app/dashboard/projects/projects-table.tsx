"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
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
import { updateProjectStatus } from "./actions";
import { ProjectFormDialog } from "./project-form-dialog";

const STATUS_OPTIONS = ["NEW", "PLANNING", "SCHEDULED", "ACTIVE", "COMPLETED", "CLOSED"] as const;

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
};

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
          await updateProjectStatus(id, value as (typeof STATUS_OPTIONS)[number]);
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
  consultants: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
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

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Projects</h2>
          <p className="text-sm text-muted-foreground">Track engagements from kickoff to closure.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
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
          {canManage && (
            <Button size="sm" onClick={() => setDialog({ open: true, project: undefined })}>
              <Plus className="size-4" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No projects match your filters.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Consultant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dates</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((project) => (
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
                  <StatusSelect id={project.id} status={project.status} canManage={canManage} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {project.startDate ? new Date(project.startDate).toLocaleDateString("en-US") : "—"}
                  {project.endDate ? ` – ${new Date(project.endDate).toLocaleDateString("en-US")}` : ""}
                </TableCell>
              </TableRow>
            ))}
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
