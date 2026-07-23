"use client";

import { useMemo, useState } from "react";
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
import { CustomerFormDialog } from "./customer-form-dialog";

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  vesselCount: number;
  bookingCount: number;
};

export function CustomersTable({
  customers,
  companies,
  canManage,
}: {
  customers: CustomerRow[];
  companies: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        (customer.email ?? "").toLowerCase().includes(query) ||
        (customer.companyName ?? "").toLowerCase().includes(query),
    );
  }, [customers, search]);

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Customers</h2>
          <p className="text-sm text-muted-foreground">
            Search customers and open a profile to manage vessels and contact history.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search name, email, company..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:w-64"
          />
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

      {filtered.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No customers match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Vessels</TableHead>
              <TableHead>Bookings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((customer) => (
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
      )}
    </div>
  );
}
