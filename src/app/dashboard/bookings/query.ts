import type { Prisma } from "@/generated/prisma/client";
import type { BookingStatus } from "@/generated/prisma/enums";

export const PAGE_SIZE = 20;

export const STATUS_OPTIONS = [
  "NEW",
  "REVIEWING",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type BookingStatusValue = (typeof STATUS_OPTIONS)[number];
export type BookingStatusFilter = "ALL" | BookingStatusValue;

/** Allowed forward/side moves per status. Same-status is always permitted (no-op). */
export const STATUS_TRANSITIONS: Record<BookingStatusValue, BookingStatusValue[]> = {
  NEW: ["REVIEWING", "CANCELLED"],
  REVIEWING: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "REVIEWING", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: BookingStatusValue, to: BookingStatusValue): boolean {
  return from === to || STATUS_TRANSITIONS[from].includes(to);
}
export type BookingSortKey = "date" | "customer" | "status";
export type SortDir = "asc" | "desc";

export type BookingListParams = {
  query: string;
  status: BookingStatusFilter;
  sort: BookingSortKey;
  dir: SortDir;
  page: number;
};

function isStatus(value: string): value is (typeof STATUS_OPTIONS)[number] {
  return (STATUS_OPTIONS as readonly string[]).includes(value);
}

/** Parses raw `searchParams` (strings) into a validated, defaulted list query. */
export function parseBookingListParams(
  raw: Record<string, string | string[] | undefined>,
): BookingListParams {
  const get = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const statusRaw = get("status") ?? "ALL";
  const sortRaw = get("sort");
  const dirRaw = get("dir");
  const pageRaw = Number(get("page"));

  return {
    query: (get("q") ?? "").trim(),
    status: statusRaw === "ALL" || isStatus(statusRaw) ? (statusRaw as BookingStatusFilter) : "ALL",
    sort: sortRaw === "customer" || sortRaw === "status" ? sortRaw : "date",
    dir: dirRaw === "asc" ? "asc" : "desc",
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
  };
}

export function buildBookingWhere(params: BookingListParams): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};

  if (params.status !== "ALL") {
    where.status = params.status as BookingStatus;
  }

  if (params.query) {
    const q = params.query;
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
      { vesselName: { contains: q, mode: "insensitive" } },
      { service: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  return where;
}

export function buildBookingOrderBy(
  params: BookingListParams,
): Prisma.BookingOrderByWithRelationInput[] {
  if (params.sort === "customer") {
    return [{ customerName: params.dir }];
  }
  if (params.sort === "status") {
    return [{ status: params.dir }];
  }
  // date: preferred date first, fall back to submission time
  return [{ preferredDate: params.dir }, { createdAt: params.dir }];
}
