"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Check, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { toggleServiceActive, updateServicePrice } from "./actions";
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
  basePrice: number | null;
  priceUnit: string | null;
  bookingCount: number;
  isActive: boolean;
  faq: unknown;
  requiredForms: RequiredFormRow[];
};

const php = (amount: number) =>
  amount.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

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

function PriceCell({ service, canManage }: { service: ServiceRow; canManage: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(service.basePrice != null ? String(service.basePrice) : "");
  const [isPending, startTransition] = useTransition();

  const display =
    service.basePrice != null ? (
      <>
        <span className="font-medium text-foreground">{php(service.basePrice)}</span>
        {service.priceUnit && (
          <span className="ml-1 text-xs text-muted-foreground">{service.priceUnit.toLowerCase()}</span>
        )}
      </>
    ) : (
      <span className="text-muted-foreground">On request</span>
    );

  if (!canManage) return <div className="text-sm">{display}</div>;

  function save() {
    const trimmed = value.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    startTransition(async () => {
      const result = await updateServicePrice(service.id, next, service.priceUnit);
      if (result.error) notify.error(result.error);
      else notify.success("Price updated");
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1 text-sm hover:text-foreground"
      >
        {display}
        <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        type="number"
        min={0}
        step="0.01"
        value={value}
        disabled={isPending}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") setEditing(false);
        }}
        placeholder="On request"
        className="h-8 w-28"
      />
      <Button variant="ghost" size="icon-sm" aria-label="Save price" disabled={isPending} onClick={save}>
        <Check className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Cancel"
        disabled={isPending}
        onClick={() => {
          setValue(service.basePrice != null ? String(service.basePrice) : "");
          setEditing(false);
        }}
      >
        <X className="size-4" />
      </Button>
    </div>
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
      <TableCell className={cn(indent && "border-l-2 border-border")}>
        <div className={cn("font-medium text-foreground", indent && "pl-5")}>{service.name}</div>
        <div className={cn("text-xs text-muted-foreground", indent && "pl-5")}>/{service.slug}</div>
      </TableCell>
      <TableCell>
        <PriceCell service={service} canManage={canManage} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {service.defaultConsultantName ?? "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {service.bookingCount} {service.bookingCount === 1 ? "booking" : "bookings"}
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
  storageConfigured = true,
}: {
  services: ServiceRow[];
  categories: { id: string; name: string }[];
  consultants: { id: string; name: string }[];
  canManage: boolean;
  availableForms: { id: string; title: string }[];
  storageConfigured?: boolean;
}) {
  const [dialog, setDialog] = useState<{ open: boolean; service?: ServiceRow }>({
    open: false,
    service: undefined,
  });
  const [search, setSearch] = useState("");

  const topLevel = services.filter((service) => !service.parentServiceId);

  // Rows to render: when searching, a flat filtered list (no grouping/indent);
  // otherwise grouped by category with children nested under parents.
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (query) {
      return services
        .filter((service) => service.name.toLowerCase().includes(query))
        .map((service) => ({ service, indent: false, categoryHeader: null as string | null }));
    }

    const childrenByParent = new Map<string, ServiceRow[]>();
    for (const service of services) {
      if (!service.parentServiceId) continue;
      const siblings = childrenByParent.get(service.parentServiceId) ?? [];
      siblings.push(service);
      childrenByParent.set(service.parentServiceId, siblings);
    }

    const byOrderThenName = (a: ServiceRow, b: ServiceRow) =>
      a.order - b.order || a.name.localeCompare(b.name);

    // Group by category: all services of a category sit together under one header.
    const sortedTop = [...topLevel].sort(
      (a, b) => a.categoryName.localeCompare(b.categoryName) || byOrderThenName(a, b),
    );

    const result: { service: ServiceRow; indent: boolean; categoryHeader: string | null }[] = [];
    let lastCategory: string | null = null;
    for (const parent of sortedTop) {
      const header = parent.categoryName !== lastCategory ? parent.categoryName : null;
      lastCategory = parent.categoryName;
      result.push({ service: parent, indent: false, categoryHeader: header });
      for (const child of [...(childrenByParent.get(parent.id) ?? [])].sort(byOrderThenName)) {
        result.push({ service: child, indent: true, categoryHeader: null });
      }
    }
    return result;
  }, [services, topLevel, search]);

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold">Services</h2>
          <p className="text-sm text-muted-foreground">
            Manage the service catalog, pricing, and required forms.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:w-56"
          />
          {canManage && (
            <Button size="sm" onClick={() => setDialog({ open: true, service: undefined })}>
              <Plus className="size-4" />
              New Service
            </Button>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Consultant</TableHead>
            <TableHead>Bookings</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ service, indent, categoryHeader }) => (
            <Fragment key={service.id}>
              {categoryHeader && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="bg-amber-100 py-2 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
                  >
                    {categoryHeader}
                  </TableCell>
                </TableRow>
              )}
              <ServiceTableRow
                service={service}
                canManage={canManage}
                indent={indent}
                onEdit={() => setDialog({ open: true, service })}
              />
            </Fragment>
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
        storageConfigured={storageConfigured}
      />
    </div>
  );
}
