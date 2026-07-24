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
import { createBranch, updateBranch } from "./actions";

type BranchRecord = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export function BranchFormDialog({
  trigger,
  branch,
}: {
  trigger: React.ReactElement;
  branch?: BranchRecord;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = branch
        ? await updateBranch(branch.id, {}, formData)
        : await createBranch({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      notify.success(branch ? "Branch updated" : "Branch created");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{branch ? "Edit Branch" : "New Branch"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={branch?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={branch?.phone ?? ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={branch?.email ?? ""} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={branch?.address ?? ""} />
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
