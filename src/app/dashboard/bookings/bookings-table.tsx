"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Download, ArrowUpDown, UserPlus } from "lucide-react";
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
import { updateBookingStatus, assignConsultant } from "./actions";
import { addBookingToCrm } from "../customers/actions";

export type BookingRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  companyName: string | null;
  vesselName: string | null;
  serviceName: string;
  status: string;
  assignedConsultantId: string | null;
  customerId: string | null;
  preferredDate: string | null; // ISO date string
  preferredTime: string | null;
  createdAt: string; // ISO date string
};

const STATUS_OPTIONS = [
  "NEW",
  "REVIEWING",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

type SortKey = "date" | "customer" | "status";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function StatusSelect({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          await updateBookingStatus(id, value as (typeof STATUS_OPTIONS)[number]);
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

function ConsultantSelect({
  id,
  consultantId,
  consultants,
}: {
  id: string;
  consultantId: string | null;
  consultants: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={consultantId ?? "unassigned"}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          await assignConsultant(id, value === "unassigned" ? null : value);
          notify.success("Consultant updated");
        });
      }}
    >
      <SelectTrigger size="sm" className="w-[150px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {consultants.map((consultant) => (
          <SelectItem key={consultant.id} value={consultant.id}>
            {consultant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CrmCell({ id, customerId }: { id: string; customerId: string | null }) {
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
          await addBookingToCrm(id);
          notify.success("Added to CRM");
        });
      }}
    >
      <UserPlus className="size-4" />
      Add to CRM
    </Button>
  );
}

export function BookingsTable({
  bookings,
  consultants,
  canManage,
}: {
  bookings: BookingRow[];
  consultants: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    let rows = bookings.filter((booking) => {
      if (statusFilter !== "ALL" && booking.status !== statusFilter) return false;
      if (!query) return true;
      return (
        booking.customerName.toLowerCase().includes(query) ||
        booking.customerEmail.toLowerCase().includes(query) ||
        (booking.vesselName ?? "").toLowerCase().includes(query) ||
        (booking.companyName ?? "").toLowerCase().includes(query) ||
        booking.serviceName.toLowerCase().includes(query)
      );
    });

    rows = [...rows].sort((a, b) => {
      let comparison = 0;
      if (sortKey === "date") {
        const aDate = a.preferredDate ?? a.createdAt;
        const bDate = b.preferredDate ?? b.createdAt;
        comparison = aDate.localeCompare(bDate);
      } else if (sortKey === "customer") {
        comparison = a.customerName.localeCompare(b.customerName);
      } else {
        comparison = a.status.localeCompare(b.status);
      }
      return sortDir === "asc" ? comparison : -comparison;
    });

    return rows;
  }, [bookings, search, statusFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function exportCsv() {
    const header = [
      "Preferred Date",
      "Preferred Time",
      "Customer",
      "Email",
      "Company",
      "Vessel",
      "Service",
      "Status",
      "Submitted",
    ];
    const rows = filtered.map((booking) => [
      formatDate(booking.preferredDate) ?? "",
      booking.preferredTime ?? "",
      booking.customerName,
      booking.customerEmail,
      booking.companyName ?? "",
      booking.vesselName ?? "",
      booking.serviceName,
      booking.status,
      formatDate(booking.createdAt) ?? "",
    ]);

    const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">All Bookings</h2>
          <p className="text-sm text-muted-foreground">
            Search, filter, sort, and export booking requests.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Search customer, vessel, service..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:w-64"
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
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No bookings match your filters.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("date")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Time <ArrowUpDown className="size-3" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("customer")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Customer <ArrowUpDown className="size-3" />
                </button>
              </TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Vessel</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Consultant</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("status")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Status <ArrowUpDown className="size-3" />
                </button>
              </TableHead>
              <TableHead>CRM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="text-sm">
                  {formatDate(booking.preferredDate) ?? (
                    <span className="text-muted-foreground">No date</span>
                  )}
                  {booking.preferredTime && (
                    <div className="text-xs text-muted-foreground">{booking.preferredTime}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">{booking.customerName}</div>
                  <div className="text-xs text-muted-foreground">{booking.customerEmail}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {booking.companyName ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {booking.vesselName ?? "—"}
                </TableCell>
                <TableCell className="text-sm">{booking.serviceName}</TableCell>
                <TableCell>
                  {canManage ? (
                    <ConsultantSelect
                      id={booking.id}
                      consultantId={booking.assignedConsultantId}
                      consultants={consultants}
                    />
                  ) : (
                    consultants.find((c) => c.id === booking.assignedConsultantId)?.name ?? "Unassigned"
                  )}
                </TableCell>
                <TableCell>
                  {canManage ? (
                    <StatusSelect id={booking.id} status={booking.status} />
                  ) : (
                    <Badge variant="outline">{booking.status.replace(/_/g, " ")}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canManage && <CrmCell id={booking.id} customerId={booking.customerId} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
