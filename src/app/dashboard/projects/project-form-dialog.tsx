"use client";

import { useMemo, useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { rankByProximity } from "@/lib/nearest-consultant";
import { createProject, updateProject } from "./actions";

const STATUS_OPTIONS = ["NEW", "PLANNING", "SCHEDULED", "ACTIVE", "COMPLETED", "CLOSED"] as const;

export type ConsultantOption = {
  id: string;
  name: string;
  baseLocations: string[];
  address: string | null;
};

type ProjectRecord = {
  id: string;
  name: string;
  customerId: string | null;
  vesselId: string | null;
  serviceId: string | null;
  consultantId: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  location: string | null;
};

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  customers,
  vessels,
  services,
  consultants,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectRecord;
  customers: { id: string; name: string }[];
  vessels: { id: string; name: string }[];
  services: { id: string; name: string }[];
  consultants: ConsultantOption[];
}) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [location, setLocation] = useState(project?.location ?? "");

  const rankedConsultants = useMemo(
    () => rankByProximity(consultants, location),
    [consultants, location],
  );
  const hasNearest = location.trim().length > 0 && rankedConsultants.some((c) => c.isNearest);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = project
        ? await updateProject(project.id, {}, formData)
        : await createProject({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      notify.success(project ? "Project updated" : "Project created");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={project?.name} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="customerId">Customer</Label>
              <Select name="customerId" defaultValue={project?.customerId ?? "none"}>
                <SelectTrigger id="customerId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vesselId">Vessel</Label>
              <Select name="vesselId" defaultValue={project?.vesselId ?? "none"}>
                <SelectTrigger id="vesselId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vessels.map((vessel) => (
                    <SelectItem key={vessel.id} value={vessel.id}>
                      {vessel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="serviceId">Service</Label>
              <Select name="serviceId" defaultValue={project?.serviceId ?? "none"}>
                <SelectTrigger id="serviceId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="consultantId">Consultant</Label>
              <Select name="consultantId" defaultValue={project?.consultantId} required>
                <SelectTrigger id="consultantId" className="w-full">
                  <SelectValue placeholder="Select a consultant" />
                </SelectTrigger>
                <SelectContent>
                  {rankedConsultants.map((consultant) => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      <span className="flex w-full items-center justify-between gap-2">
                        <span>{consultant.name}</span>
                        {consultant.isNearest && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-ocean/15 px-1.5 py-0.5 text-[11px] font-medium text-ocean">
                            <MapPin className="size-3" />
                            Nearest
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasNearest && (
                <p className="text-xs text-muted-foreground">
                  Consultants nearest to {location.trim()} are shown first.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="location">Location / port</Label>
            <Input
              id="location"
              name="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. Aberdeen"
            />
            <p className="text-xs text-muted-foreground">
              Where the work happens — used to surface the nearest consultant.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={project?.status ?? "NEW"} required>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={project?.startDate?.slice(0, 10) ?? ""}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={project?.endDate?.slice(0, 10) ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={project?.description ?? ""} rows={3} />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="self-end">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
