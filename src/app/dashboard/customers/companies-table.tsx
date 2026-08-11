"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CompanyFormDialog } from "./company-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";

type CompanyRow = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  customerCount: number;
};

export function CompaniesTable({
  companies,
  canManage,
}: {
  companies: CompanyRow[];
  canManage: boolean;
}) {
  return (
    <div className="rounded-xl border-t-[3px] border-t-blue-500 bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="font-heading text-base font-semibold">Companies</h2>
          <p className="text-sm text-muted-foreground">
            Business accounts customers and vessels can belong to.
          </p>
        </div>
        {canManage && (
          <CompanyFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                New Company
              </Button>
            }
          />
        )}
      </div>

      {companies.length === 0 ? (
        <EmptyState className="border-none" title="No companies yet" description="Add your first company to get started." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Customers</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium text-foreground">{company.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {company.email ?? company.phone ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[company.city, company.country].filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell>
                  {company.customerCount > 0 ? (
                    <Link
                      href={`/dashboard/customers?company=${company.id}`}
                      className="text-foreground hover:underline"
                    >
                      {company.customerCount}
                    </Link>
                  ) : (
                    company.customerCount
                  )}
                </TableCell>
                <TableCell>
                  {canManage && (
                    <CompanyFormDialog
                      company={company}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Edit company">
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
