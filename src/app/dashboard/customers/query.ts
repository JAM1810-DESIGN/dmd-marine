import type { Prisma } from "@/generated/prisma/client";

export const PAGE_SIZE = 20;

export type CustomerSortKey = "name" | "company" | "vessels" | "bookings";
export type SortDir = "asc" | "desc";

export type CustomerListParams = {
  query: string;
  company: string | null;
  sort: CustomerSortKey;
  dir: SortDir;
  page: number;
};

export function parseCustomerListParams(
  raw: Record<string, string | string[] | undefined>,
): CustomerListParams {
  const get = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const sortRaw = get("sort");
  const pageRaw = Number(get("page"));
  const validSort: CustomerSortKey[] = ["name", "company", "vessels", "bookings"];

  return {
    query: (get("q") ?? "").trim(),
    company: get("company") ?? null,
    sort: validSort.includes(sortRaw as CustomerSortKey) ? (sortRaw as CustomerSortKey) : "name",
    dir: get("dir") === "desc" ? "desc" : "asc",
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
  };
}

export function buildCustomerWhere(params: CustomerListParams): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};

  if (params.company) {
    where.companyId = params.company;
  }

  if (params.query) {
    const q = params.query;
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { company: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  return where;
}

export function buildCustomerOrderBy(
  params: CustomerListParams,
): Prisma.CustomerOrderByWithRelationInput {
  switch (params.sort) {
    case "company":
      return { company: { name: params.dir } };
    case "vessels":
      return { vessels: { _count: params.dir } };
    case "bookings":
      return { bookings: { _count: params.dir } };
    default:
      return { name: params.dir };
  }
}
