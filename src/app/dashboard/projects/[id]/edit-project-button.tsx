"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog, type ConsultantOption } from "../project-form-dialog";

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

export function EditProjectButton({
  project,
  customers,
  vessels,
  services,
  consultants,
}: {
  project: ProjectRecord;
  customers: { id: string; name: string }[];
  vessels: { id: string; name: string }[];
  services: { id: string; name: string }[];
  consultants: ConsultantOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        Edit
      </Button>
      <ProjectFormDialog
        open={open}
        onOpenChange={setOpen}
        project={project}
        customers={customers}
        vessels={vessels}
        services={services}
        consultants={consultants}
      />
    </>
  );
}
