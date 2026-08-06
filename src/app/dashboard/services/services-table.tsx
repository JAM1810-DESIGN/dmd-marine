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
import { type RequiredFormRow } from "./required-forms-section";

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  parentServiceId: string | null;
  overview: string | null;
  benefits: string | null;
  scope: string | null;
  process: string | null;
  defaultConsultantId: string | null;
  defaultConsultantName: string | null;
  order: number;
  isActive: boolean;
  faq: unknown;
  requiredForms: RequiredFormRow[];
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

function ServiceTableRow({
  service,
  canManage,
  indent,
  onEdit,
}: {
  service: ServiceRow;
  canManage: boolean;
  indent: boolean;
  onEdit: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className={`font-medium text-foreground ${indent ? "pl-6" : ""}`}>
          {indent ? "↳ " : ""}
          {service.name}
        </div>
        <div className={`text-xs text-muted-foreground ${indent ? "pl-6" : ""}`}>
          /{service.slug}
        </div>
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
          <Button variant="ghost" size="icon-sm" aria-label="Edit service" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ServicesTable({
  services,
  categories,
  consultants,
  canManage,
  availableForms,
}: {
  services: ServiceRow[];
  categories: { id: string; name: string }[];
  consultants: { id: string; name: string }[];
  canManage: boolean;
  availableForms: { id: string; title: string }[];
}) {
  const [dialog, setDialog] = useState<{ open: boolean; service?: ServiceRow }>({
    open: false,
    service: undefined,
  });

  const topLevel = services.filter((service) => !service.parentServiceId);
  const childrenByParent = new Map<string, ServiceRow[]>();
  for (const service of services) {
    if (!service.parentServiceId) continue;
    const siblings = childrenByParent.get(service.parentServiceId) ?? [];
    siblings.push(service);
    childrenByParent.set(service.parentServiceId, siblings);
  }

  const orderedRows: { service: ServiceRow; indent: boolean }[] = [];
  for (const parent of topLevel) {
    orderedRows.push({ service: parent, indent: false });
    for (const child of childrenByParent.get(parent.id) ?? []) {
      orderedRows.push({ service: child, indent: true });
    }
  }

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
          {orderedRows.map(({ service, indent }) => (
            <ServiceTableRow
              key={service.id}
              service={service}
              canManage={canManage}
              indent={indent}
              onEdit={() => setDialog({ open: true, service })}
            />
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
        topLevelServices={topLevel
          .filter((service) => service.isActive)
          .map((service) => ({ id: service.id, name: service.name }))}
        availableForms={availableForms}
      />
    </div>
  );
}
