"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Mail,
  Phone,
  Anchor,
  MapPin,
  FileText,
  FolderOpen,
  Receipt,
  CalendarClock,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getBookingDetail, type BookingDetail } from "./actions";

const PHP = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function fmtDate(iso: string | null, withTime = false) {
  if (!iso) return "—";
  return format(new Date(iso), withTime ? "d MMM yyyy, h:mm a" : "d MMM yyyy");
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}

export function BookingDetailSheet({
  bookingId,
  open,
  onOpenChange,
}: {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !bookingId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setDetail(null);
      try {
        const result = await getBookingDetail(bookingId);
        if (active) setDetail(result);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [open, bookingId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{detail?.serviceName ?? "Booking"}</SheetTitle>
          <SheetDescription>
            {detail ? `Requested ${fmtDate(detail.createdAt)}` : "Loading booking details"}
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {!loading && !detail && (
          <p className="p-4 text-sm text-muted-foreground">Booking not found.</p>
        )}

        {!loading && detail && (
          <div className="flex flex-col divide-y divide-border">
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{detail.customerName}</p>
                  {detail.companyName && (
                    <p className="text-xs text-muted-foreground">{detail.companyName}</p>
                  )}
                </div>
                <Badge variant="outline">{detail.status.replace(/_/g, " ")}</Badge>
              </div>
              <Row icon={<Mail className="size-4" />} label="Email" value={detail.customerEmail} />
              <Row icon={<Phone className="size-4" />} label="Phone" value={detail.customerPhone ?? "—"} />
              <Row icon={<Anchor className="size-4" />} label="Vessel" value={detail.vesselName ?? "—"} />
              <Row icon={<MapPin className="size-4" />} label="Port" value={detail.port ?? "—"} />
              <Row
                icon={<CalendarClock className="size-4" />}
                label="Preferred"
                value={
                  detail.preferredDate
                    ? `${fmtDate(detail.preferredDate)}${detail.preferredTime ? ` · ${detail.preferredTime}` : ""}`
                    : "—"
                }
              />
              <Row
                icon={<span className="size-4" />}
                label="Consultant"
                value={detail.consultantName ?? "Unassigned"}
              />
            </div>

            {detail.message && (
              <div className="p-4">
                <SectionLabel>Customer message</SectionLabel>
                <p className="whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-sm text-foreground">
                  {detail.message}
                </p>
              </div>
            )}

            {detail.attachments.length > 0 && (
              <div className="p-4">
                <SectionLabel>Attachments</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {detail.attachments.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-secondary"
                    >
                      <FileText className="size-3.5" />
                      {file.fileName}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4">
              <SectionLabel>Linked records</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {detail.project ? (
                  <Link
                    href={`/dashboard/projects/${detail.project.id}`}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="size-4 text-ocean" />
                      {detail.project.name}
                    </span>
                    <Badge variant="outline">{detail.project.status.replace(/_/g, " ")}</Badge>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">No linked project.</p>
                )}

                {detail.invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/dashboard/finance/invoices/${invoice.id}`}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <Receipt className="size-4 text-ocean" />
                      {invoice.invoiceNumber} · {PHP.format(invoice.totalAmount)}
                    </span>
                    <Badge variant="outline">{invoice.status.replace(/_/g, " ")}</Badge>
                  </Link>
                ))}

                {detail.schedule && (
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <CalendarClock className="size-4 text-ocean" />
                      {detail.schedule.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fmtDate(detail.schedule.startAt, true)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4">
              <SectionLabel>Timeline</SectionLabel>
              <ol className="flex flex-col gap-3">
                {detail.timeline.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-ocean" />
                    <div className="text-sm">
                      <p className="text-foreground">{event.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(event.at, true)}
                        {event.actor ? ` · ${event.actor}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
