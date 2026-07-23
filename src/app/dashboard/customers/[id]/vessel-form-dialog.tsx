"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { createVessel, updateVessel } from "../actions";

type VesselRecord = {
  id: string;
  name: string;
  imoNumber: string | null;
  type: string | null;
  flag: string | null;
};

export function VesselFormDialog({
  trigger,
  customerId,
  vessel,
}: {
  trigger: React.ReactElement;
  customerId: string;
  vessel?: VesselRecord;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = vessel
        ? await updateVessel(vessel.id, customerId, {}, formData)
        : await createVessel(customerId, {}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      notify.success(vessel ? "Vessel updated" : "Vessel added");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{vessel ? "Edit Vessel" : "Add Vessel"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Vessel Name</Label>
            <Input id="name" name="name" defaultValue={vessel?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="imoNumber">IMO Number</Label>
              <Input id="imoNumber" name="imoNumber" defaultValue={vessel?.imoNumber ?? ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="flag">Flag</Label>
              <Input id="flag" name="flag" defaultValue={vessel?.flag ?? ""} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="type">Vessel Type</Label>
            <Input id="type" name="type" defaultValue={vessel?.type ?? ""} />
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
