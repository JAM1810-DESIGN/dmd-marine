"use client";

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
import { VendorFormDialog } from "./vendor-form-dialog";

type VendorRow = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

export function VendorsTable({ vendors, canManage }: { vendors: VendorRow[]; canManage: boolean }) {
  return (
    <div className="rounded-xl border-t-[3px] border-t-neutral-400 bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="font-heading text-base font-semibold">Vendors</h2>
          <p className="text-sm text-muted-foreground">Suppliers and vendors billed for expenses.</p>
        </div>
        {canManage && (
          <VendorFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                New Vendor
              </Button>
            }
          />
        )}
      </div>

      {vendors.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No vendors yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium text-foreground">{vendor.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {vendor.contactName ?? vendor.email ?? vendor.phone ?? "—"}
                </TableCell>
                <TableCell>
                  {canManage && (
                    <VendorFormDialog
                      vendor={vendor}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Edit vendor">
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
