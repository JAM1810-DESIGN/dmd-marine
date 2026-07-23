"use client";

import { useState, useTransition } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { toggleServiceActive } from "./actions";
import { ServiceFormDialog } from "./service-form-dialog";

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  overview: string | null;
  benefits: string | null;
  scope: string | null;
  process: string | null;
  defaultConsultantId: string | null;
  defaultConsultantName: string | null;
  order: number;
  isActive: boolean;
  faq: unknown;
};

function ActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          await toggleServiceActive(id, checked);
          notify.success(checked ? "Service activated" : "Service disabled");
        });
      }}
    />
  );
}

export function ServicesTable({
  services,
  categories,
  consultants,
  canManage,
}: {
  services: ServiceRow[];
  categories: { id: string; name: string }[];
  consultants: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [dialog, setDialog] = useState<{ open: boolean; service?: ServiceRow }>({
    open: false,
    service: undefined,
  });

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="font-heading text-base font-semibold">Services</h2>
          <p className="text-sm text-muted-foreground">
            Manage the service catalog shown on the website and in bookings.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setDialog({ open: true, service: undefined })}>
            <Plus className="size-4" />
            New Service
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Consultant</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell>
                <div className="font-medium text-foreground">{service.name}</div>
                <div className="text-xs text-muted-foreground">/{service.slug}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{service.categoryName}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {service.defaultConsultantName ?? "—"}
              </TableCell>
              <TableCell>
                {canManage ? (
                  <ActiveToggle id={service.id} isActive={service.isActive} />
                ) : (
                  <Badge variant={service.isActive ? "default" : "outline"}>
                    {service.isActive ? "Active" : "Disabled"}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit service"
                    onClick={() => setDialog({ open: true, service })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ServiceFormDialog
        key={dialog.service?.id ?? "new"}
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        service={dialog.service}
        categories={categories}
        consultants={consultants}
      />
    </div>
  );
}
