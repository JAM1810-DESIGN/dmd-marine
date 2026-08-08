"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { BookingStatus } from "@/generated/prisma/enums";
import {
  buildBookingOrderBy,
  buildBookingWhere,
  type BookingListParams,
} from "./query";

export type ActionState = { error?: string; success?: boolean };

const BOOKING_ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<ActionState> {
  try {
    const session = await requireRole(...BOOKING_ROLES);

    const existing = await db.booking.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return { error: "Booking not found." };
    if (existing.status === status) return { success: true };

    await db.booking.update({ where: { id }, data: { status } });
    await logAudit({
      userId: session.user.id,
      action: "BOOKING_STATUS_UPDATED",
      entityType: "Booking",
      entityId: id,
      metadata: { from: existing.status, to: status },
    });

    revalidatePath("/dashboard/bookings");
    return { success: true };
  } catch {
    return { error: "Couldn't update the status. Try again." };
  }
}

export async function assignConsultant(
  id: string,
  consultantId: string | null,
): Promise<ActionState> {
  try {
    const session = await requireRole(...BOOKING_ROLES);

    const existing = await db.booking.findUnique({
      where: { id },
      select: { assignedConsultantId: true },
    });
    if (!existing) return { error: "Booking not found." };

    if (consultantId) {
      const consultant = await db.user.findFirst({
        where: { id: consultantId, isActive: true },
        select: { id: true },
      });
      if (!consultant) return { error: "That consultant is no longer available." };
    }

    await db.booking.update({ where: { id }, data: { assignedConsultantId: consultantId } });
    await logAudit({
      userId: session.user.id,
      action: consultantId ? "BOOKING_ASSIGNED" : "BOOKING_UNASSIGNED",
      entityType: "Booking",
      entityId: id,
      metadata: { from: existing.assignedConsultantId, to: consultantId },
    });

    revalidatePath("/dashboard/bookings");
    return { success: true };
  } catch {
    return { error: "Couldn't update the consultant. Try again." };
  }
}

export type BookingTimelineEvent = {
  id: string;
  label: string;
  actor: string | null;
  at: string; // ISO
};

export type BookingDetail = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  companyName: string | null;
  vesselName: string | null;
  port: string | null;
  message: string | null;
  serviceName: string;
  status: string;
  preferredDate: string | null;
  preferredTime: string | null;
  createdAt: string;
  updatedAt: string;
  consultantName: string | null;
  attachments: { id: string; fileName: string; url: string }[];
  project: { id: string; name: string; status: string } | null;
  invoices: { id: string; invoiceNumber: string; totalAmount: number; status: string }[];
  schedule: { id: string; title: string; startAt: string; endAt: string; type: string } | null;
  timeline: BookingTimelineEvent[];
};

function describeAudit(action: string, metadata: unknown): string {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  switch (action) {
    case "BOOKING_STATUS_UPDATED":
      return `Status changed to ${String(meta.to ?? "").replace(/_/g, " ") || "updated"}`;
    case "BOOKING_ASSIGNED":
      return "Consultant assigned";
    case "BOOKING_UNASSIGNED":
      return "Consultant unassigned";
    case "BOOKING_ADDED_TO_CRM":
      return "Added to CRM";
    default:
      return action.replace(/_/g, " ").toLowerCase();
  }
}

export async function getBookingDetail(id: string): Promise<BookingDetail | null> {
  await requireRole(...BOOKING_ROLES, "FINANCE_OFFICER");

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      service: { select: { name: true } },
      assignedConsultant: { select: { name: true } },
      attachments: { select: { id: true, fileName: true, url: true }, orderBy: { createdAt: "asc" } },
      project: { select: { id: true, name: true, status: true } },
      invoices: {
        select: { id: true, invoiceNumber: true, totalAmount: true, status: true },
        orderBy: { createdAt: "desc" },
      },
      schedule: { select: { id: true, title: true, startAt: true, endAt: true, type: true } },
    },
  });
  if (!booking) return null;

  const audits = await db.auditLog.findMany({
    where: { entityType: "Booking", entityId: id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const timeline: BookingTimelineEvent[] = [
    {
      id: `${booking.id}-created`,
      label: "Request submitted",
      actor: null,
      at: booking.createdAt.toISOString(),
    },
    ...audits.map((entry) => ({
      id: entry.id,
      label: describeAudit(entry.action, entry.metadata),
      actor: entry.user?.name ?? null,
      at: entry.createdAt.toISOString(),
    })),
  ];

  return {
    id: booking.id,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    companyName: booking.companyName,
    vesselName: booking.vesselName,
    port: booking.port,
    message: booking.message,
    serviceName: booking.service.name,
    status: booking.status,
    preferredDate: booking.preferredDate ? booking.preferredDate.toISOString() : null,
    preferredTime: booking.preferredTime,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    consultantName: booking.assignedConsultant?.name ?? null,
    attachments: booking.attachments,
    project: booking.project,
    invoices: booking.invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: Number(invoice.totalAmount),
      status: invoice.status,
    })),
    schedule: booking.schedule
      ? {
          id: booking.schedule.id,
          title: booking.schedule.title,
          startAt: booking.schedule.startAt.toISOString(),
          endAt: booking.schedule.endAt.toISOString(),
          type: booking.schedule.type,
        }
      : null,
    timeline,
  };
}

export type BookingExportRow = {
  preferredDate: string | null;
  preferredTime: string | null;
  customerName: string;
  customerEmail: string;
  companyName: string | null;
  vesselName: string | null;
  serviceName: string;
  status: string;
  createdAt: string;
};

/** Returns every booking matching the current filters (ignores pagination) for CSV export. */
export async function exportBookings(
  params: BookingListParams,
): Promise<BookingExportRow[]> {
  await requireRole(...BOOKING_ROLES, "FINANCE_OFFICER");

  const bookings = await db.booking.findMany({
    where: buildBookingWhere(params),
    orderBy: buildBookingOrderBy(params),
    include: { service: { select: { name: true } } },
  });

  return bookings.map((booking) => ({
    preferredDate: booking.preferredDate ? booking.preferredDate.toISOString() : null,
    preferredTime: booking.preferredTime,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    companyName: booking.companyName,
    vesselName: booking.vesselName,
    serviceName: booking.service.name,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
  }));
}
