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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { createCustomer, updateCustomer } from "./actions";

type CustomerRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyId: string | null;
  notes: string | null;
};

export function CustomerFormDialog({
  trigger,
  customer,
  companies,
}: {
  trigger: React.ReactElement;
  customer?: CustomerRecord;
  companies: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = customer
        ? await updateCustomer(customer.id, {}, formData)
        : await createCustomer({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      notify.success(customer ? "Customer updated" : "Customer created");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit Customer" : "New Customer"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={customer?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={customer?.phone ?? ""} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="companyId">Company</Label>
            <Select name="companyId" defaultValue={customer?.companyId ?? "none"}>
              <SelectTrigger id="companyId" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={customer?.notes ?? ""} rows={3} />
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
