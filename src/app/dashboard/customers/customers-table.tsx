"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Download, ArrowUpDown, X, ChevronLeft, ChevronRight } from "lucide-react";
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
import { CustomerFormDialog } from "./customer-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { exportCustomers } from "./actions";
import type { CustomerListParams, CustomerSortKey } from "./query";

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  vesselCount: number;
  bookingCount: number;
};

function SortHead({
  label,
  sortKey,
  params,
  onSort,
}: {
  label: string;
  sortKey: CustomerSortKey;
  params: CustomerListParams;
  onSort: (key: CustomerSortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 hover:text-foreground"
    >
      {label}
      <ArrowUpDown className={params.sort === sortKey ? "size-3 text-foreground" : "size-3"} />
    </button>
  );
}

export function CustomersTable({
  customers,
  companies,
  canManage,
  total,
  pageSize,
  params,
  activeCompanyName,
}: {
  customers: CustomerRow[];
  companies: { id: string; name: string }[];
  canManage: boolean;
  total: number;
  pageSize: number;
  params: CustomerListParams;
  activeCompanyName: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(params.query);

  function updateParams(next: Record<string, string | null>, resetPage = true) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") sp.delete(key);
      else sp.set(key, value);
    }
    if (resetPage) sp.delete("page");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (searchInput === params.query) return;
    const timer = setTimeout(() => {
      updateParams({ q: searchInput || null });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function toggleSort(key: CustomerSortKey) {
    const dir = params.sort === key && params.dir === "asc" ? "desc" : "asc";
    updateParams({ sort: key, dir });
  }

  async function exportCsv() {
    const header = ["Name", "Email", "Phone", "Company", "Vessels", "Bookings", "Added"];
    const data = await exportCustomers(params);
    const rows = data.map((customer) => [
      customer.name,
      customer.email,
      customer.phone,
      customer.company,
      String(customer.vessels),
      String(customer.bookings),
      customer.createdAt.slice(0, 10),
    ]);
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(header, rows));
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, totalPages);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Customers</h2>
          <p className="text-sm text-muted-foreground">
            Search customers and open a profile to manage vessels and contact history.
          </p>
          {params.company && (
            <button
              type="button"
              onClick={() => updateParams({ company: null })}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground hover:bg-secondary/70"
            >
              {activeCompanyName ?? "Company"}
              <X className="size-3" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search name, email, company..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="sm:w-64"
          />
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export
          </Button>
          {canManage && (
            <CustomerFormDialog
              companies={companies}
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  New Customer
                </Button>
              }
            />
          )}
        </div>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          className="border-none"
          title="No customers match your search"
          description="Try a different name or company."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortHead label="Name" sortKey="name" params={params} onSort={toggleSort} />
                </TableHead>
                <TableHead>
                  <SortHead label="Company" sortKey="company" params={params} onSort={toggleSort} />
                </TableHead>
                <TableHead>
                  <SortHead label="Vessels" sortKey="vessels" params={params} onSort={toggleSort} />
                </TableHead>
                <TableHead>
                  <SortHead label="Bookings" sortKey="bookings" params={params} onSort={toggleSort} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {customer.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {customer.email ?? customer.phone ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.companyName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.vesselCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.bookingCount}</Badge>
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
    </div>
  );
}
