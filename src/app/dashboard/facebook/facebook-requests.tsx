"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { notify } from "@/lib/notify";
import { updateLeadStatus, addFacebookLeadToCrm } from "./actions";
import type { FacebookLeadStatus } from "@/generated/prisma/enums";

const STATUS_OPTIONS = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"] as const;

export type RequestRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  customerId: string | null;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatusSelect({ id, status, canManage }: { id: string; status: string; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  if (!canManage) return <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>;
  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          await updateLeadStatus(id, value as FacebookLeadStatus);
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

function CrmCell({ id, customerId }: { id: string; customerId: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (customerId) {
    return (
      <Link href={`/dashboard/customers/${customerId}`}>
        <Badge variant="outline" className="hover:bg-secondary">
          View Profile
        </Badge>
      </Link>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await addFacebookLeadToCrm(id);
          notify.success("Added to CRM");
          if (result?.customerId) router.push(`/dashboard/customers/${result.customerId}`);
        });
      }}
    >
      <UserPlus className="size-4" />
      Add to CRM
    </Button>
  );
}

export function FacebookRequests({ requests, canManage }: { requests: RequestRow[]; canManage: boolean }) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const filtered = requests.filter((r) => statusFilter === "ALL" || r.status === statusFilter);

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Requests</h2>
          <p className="text-sm text-muted-foreground">Lead form submissions and booking requests from your Page.</p>
        </div>
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
      </div>

      {filtered.length === 0 ? (
        <EmptyState className="border-none" title="No requests" description="Booking requests from your Page will appear here." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>CRM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium text-foreground">{request.name ?? "Unknown"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {request.email ?? request.phone ?? "—"}
                </TableCell>
                <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                  {request.message ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</TableCell>
                <TableCell>
                  <StatusSelect id={request.id} status={request.status} canManage={canManage} />
                </TableCell>
                <TableCell>
                  <CrmCell id={request.id} customerId={request.customerId} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
