"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Download,
  ArrowUpDown,
  UserPlus,
  CalendarPlus,
  FolderPlus,
  Receipt,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  Anchor,
  MapPin,
  ClipboardList,
} from "lucide-react";
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
import { buildCsv, downloadCsv } from "@/lib/csv";
import {
  updateBookingStatus,
  assignConsultant,
  exportBookings,
} from "./actions";
import { addBookingToCrm } from "../customers/actions";
import { createProjectFromBooking } from "../projects/actions";
import { createInvoiceFromBooking } from "../finance/invoices/actions";
import { ScheduleFormDialog } from "@/components/shared/schedule-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { BookingDetailSheet } from "./booking-detail-sheet";
import {
  STATUS_OPTIONS,
  canTransition,
  type BookingListParams,
  type BookingSortKey,
  type BookingStatusValue,
} from "./query";

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

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusSelect({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          const result = await updateBookingStatus(id, value as (typeof STATUS_OPTIONS)[number]);
          if (result.error) notify.error(result.error);
          else notify.success("Status updated");
        });
      }}
    >
      <SelectTrigger size="sm" className="w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem
            key={option}
            value={option}
            disabled={!canTransition(status as BookingStatusValue, option)}
          >
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
          const result = await assignConsultant(id, value === "unassigned" ? null : value);
          if (result.error) notify.error(result.error);
          else notify.success("Consultant updated");
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

function ScheduleButton({
  booking,
  consultants,
}: {
  booking: BookingRow;
  consultants: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" />
        Schedule
      </Button>
      <ScheduleFormDialog
        open={open}
        onOpenChange={setOpen}
        target={{ type: "booking", bookingId: booking.id }}
        defaultTitle={booking.serviceName}
        defaultConsultantId={booking.assignedConsultantId}
        preferredDate={booking.preferredDate}
        preferredTime={booking.preferredTime}
        consultants={consultants}
      />
    </>
  );
}

function CreateProjectButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await createProjectFromBooking(id);
          if (result.error) {
            notify.error(result.error);
            return;
          }
          notify.success("Project created");
          if (result.projectId) router.push(`/dashboard/projects/${result.projectId}`);
        });
      }}
    >
      <FolderPlus className="size-4" />
      Create Project
    </Button>
  );
}

function GenerateInvoiceButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await createInvoiceFromBooking(id);
          if (result.error) {
            notify.error(result.error);
            return;
          }
          notify.success("Invoice created");
          if (result.id) router.push(`/dashboard/finance/invoices/${result.id}`);
        });
      }}
    >
      <Receipt className="size-4" />
      Invoice
    </Button>
  );
}

export type BoardBooking = {
  id: string;
  serviceName: string;
  customerName: string;
  companyName: string | null;
  vesselName: string | null;
  port: string | null;
  status: string;
  preferredDate: string | null;
  preferredTime: string | null;
  assignedConsultantId: string | null;
  consultantName: string | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function preferredFlag(booking: BoardBooking) {
  if (!booking.preferredDate) return { label: "No date", className: "text-muted-foreground" };
  const date = new Date(booking.preferredDate);
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days >= 0 && days <= 7) return { label: `Wants ${label}`, className: "text-amber-600 dark:text-amber-400" };
  return { label: `Wants ${label}`, className: "text-muted-foreground" };
}

function BoardCard({
  booking,
  canManage,
  onOpen,
}: {
  booking: BoardBooking;
  canManage: boolean;
  onOpen: () => void;
}) {
  const flag = preferredFlag(booking);
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
      <button type="button" onClick={onOpen} className="text-left text-sm font-medium text-foreground hover:text-ocean hover:underline">
        {booking.serviceName}
      </button>
      <p className="text-xs text-muted-foreground">
        {booking.customerName}
        {booking.companyName ? ` · ${booking.companyName}` : ""}
      </p>
      {(booking.vesselName || booking.port) && (
        <div className="flex flex-wrap gap-1.5">
          {booking.vesselName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground">
              <Anchor className="size-3" />
              {booking.vesselName}
            </span>
          )}
          {booking.port && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground">
              <MapPin className="size-3" />
              {booking.port}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between pt-0.5">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {booking.consultantName ? (
            <>
              <span className="flex size-5 items-center justify-center rounded-full bg-accent/15 text-[9px] font-medium text-accent">
                {initials(booking.consultantName)}
              </span>
              {booking.consultantName}
            </>
          ) : (
            "Unassigned"
          )}
        </span>
        <span className={cn("text-xs", flag.className)}>{flag.label}</span>
      </div>
      {canManage && (
        <div className="pt-1">
          <StatusSelect id={booking.id} status={booking.status} />
        </div>
      )}
    </div>
  );
}

export function BookingsTable({
  bookings,
  boardBookings,
  consultants,
  canManage,
  canManageFinance,
  total,
  pageSize,
  params,
}: {
  bookings: BookingRow[];
  boardBookings: BoardBooking[];
  consultants: { id: string; name: string }[];
  canManage: boolean;
  canManageFinance: boolean;
  total: number;
  pageSize: number;
  params: BookingListParams;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(params.query);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [view, setView] = useState<"table" | "board">("table");

  const boardByStatus = (() => {
    const query = searchInput.trim().toLowerCase();
    const map = new Map<string, BoardBooking[]>();
    for (const status of STATUS_OPTIONS) map.set(status, []);
    for (const booking of boardBookings) {
      if (
        query &&
        !booking.customerName.toLowerCase().includes(query) &&
        !booking.serviceName.toLowerCase().includes(query) &&
        !(booking.vesselName ?? "").toLowerCase().includes(query) &&
        !(booking.companyName ?? "").toLowerCase().includes(query)
      ) {
        continue;
      }
      map.get(booking.status)?.push(booking);
    }
    return map;
  })();

  function updateParams(next: Record<string, string | null>, resetPage = true) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") sp.delete(key);
      else sp.set(key, value);
    }
    if (resetPage) sp.delete("page");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  // Debounce the search box into the URL.
  useEffect(() => {
    if (searchInput === params.query) return;
    const timer = setTimeout(() => {
      updateParams({ q: searchInput || null });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function toggleSort(key: BookingSortKey) {
    const dir = params.sort === key && params.dir === "asc" ? "desc" : "asc";
    updateParams({ sort: key, dir });
  }

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  async function exportCsv() {
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
    const data = await exportBookings(params);
    const rows = data.map((booking) => [
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

    downloadCsv(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(header, rows));
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, totalPages);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="h-[3px] bg-amber-500" />
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
            <ClipboardList className="size-5" />
          </span>
          <div>
            <h2 className="font-heading text-base font-semibold">All Bookings</h2>
            <p className="text-sm text-muted-foreground">
              Search, filter, sort, and export booking requests.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Search customer, vessel, service..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="sm:w-64"
          />
          <Select
            value={params.status}
            onValueChange={(value) => updateParams({ status: value === "ALL" ? null : value })}
          >
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
        </div>
      </div>

      {view === "board" ? (
        <div className="overflow-x-auto p-4 pt-0">
          <div className="grid grid-flow-col auto-cols-[230px] gap-3">
            {STATUS_OPTIONS.map((status) => {
              const items = boardByStatus.get(status) ?? [];
              return (
                <div key={status} className="flex flex-col gap-2.5 rounded-xl bg-secondary/40 p-2.5">
                  <div className="flex items-center justify-between px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>{status.replace(/_/g, " ")}</span>
                    <span className="rounded-full bg-card px-2 py-0.5 text-[11px]">{items.length}</span>
                  </div>
                  {items.map((booking) => (
                    <BoardCard
                      key={booking.id}
                      booking={booking}
                      canManage={canManage}
                      onOpen={() => openDetail(booking.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          className="border-none"
          title="No bookings match your filters"
          description="Try adjusting your search or status filter."
        />
      ) : (
        <>
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
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
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                        {initials(booking.customerName)}
                      </span>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => openDetail(booking.id)}
                          className="block truncate text-left font-medium text-foreground hover:text-ocean hover:underline"
                        >
                          {booking.customerName}
                        </button>
                        <div className="truncate text-xs text-muted-foreground">{booking.customerEmail}</div>
                      </div>
                    </div>
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
                    {canManage && (
                      <div className="flex flex-wrap items-center gap-1">
                        <CrmCell id={booking.id} customerId={booking.customerId} />
                        <ScheduleButton booking={booking} consultants={consultants} />
                        <CreateProjectButton id={booking.id} />
                        {canManageFinance && <GenerateInvoiceButton id={booking.id} />}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border p-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              {rangeStart}–{rangeEnd} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) }, false)}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) }, false)}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <BookingDetailSheet bookingId={detailId} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
