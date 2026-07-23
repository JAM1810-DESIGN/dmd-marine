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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { createCompany, updateCompany } from "./actions";

type CompanyRecord = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
};

export function CompanyFormDialog({
  trigger,
  company,
}: {
  trigger: React.ReactElement;
  company?: CompanyRecord;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = company
        ? await updateCompany(company.id, {}, formData)
        : await createCompany({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      notify.success(company ? "Company updated" : "Company created");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{company ? "Edit Company" : "New Company"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={company?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={company?.phone ?? ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={company?.email ?? ""} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" defaultValue={company?.website ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={company?.address ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={company?.city ?? ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue={company?.country ?? ""} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={company?.notes ?? ""} rows={3} />
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
