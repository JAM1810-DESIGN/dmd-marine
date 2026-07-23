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
import { addContactHistory } from "../actions";

const CONTACT_TYPES = ["CALL", "EMAIL", "MEETING", "SITE_VISIT", "NOTE", "OTHER"] as const;

export function ContactHistoryFormDialog({
  trigger,
  customerId,
}: {
  trigger: React.ReactElement;
  customerId: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addContactHistory(customerId, {}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      notify.success("Contact logged");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Contact</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue="CALL" required>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="occurredAt">Date</Label>
              <Input
                id="occurredAt"
                name="occurredAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="summary">Summary</Label>
            <Textarea id="summary" name="summary" rows={3} required />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="self-end">
            {isPending ? "Saving..." : "Log Contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
