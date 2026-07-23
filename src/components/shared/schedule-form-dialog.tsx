"use client";

import { useState, useTransition } from "react";
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
import {
  createScheduleForBooking,
  createScheduleForProject,
} from "@/app/dashboard/calendar/actions";

const SCHEDULE_TYPES = ["CONSULTATION", "SURVEY", "INSPECTION", "TRAINING", "OTHER"] as const;

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Target = { type: "booking"; bookingId: string } | { type: "project"; projectId: string };

export function ScheduleFormDialog({
  open,
  onOpenChange,
  target,
  defaultTitle,
  defaultConsultantId,
  preferredDate,
  preferredTime,
  consultants,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  defaultTitle: string;
  defaultConsultantId?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  consultants: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  let defaultStart = "";
  let defaultEnd = "";
  if (preferredDate) {
    const base = new Date(preferredDate);
    if (preferredTime) {
      const [hours, minutes] = preferredTime.split(":").map(Number);
      base.setHours(hours, minutes, 0, 0);
    } else {
      base.setHours(9, 0, 0, 0);
    }
    defaultStart = toLocalInputValue(base);
    defaultEnd = toLocalInputValue(new Date(base.getTime() + 60 * 60 * 1000));
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result =
        target.type === "booking"
          ? await createScheduleForBooking(target.bookingId, {}, formData)
          : await createScheduleForProject(target.projectId, {}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      notify.success("Scheduled");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Calendar</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={defaultTitle} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue="CONSULTATION" required>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="startAt">Start</Label>
              <Input id="startAt" name="startAt" type="datetime-local" defaultValue={defaultStart} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="endAt">End</Label>
              <Input id="endAt" name="endAt" type="datetime-local" defaultValue={defaultEnd} required />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="consultantId">Consultant</Label>
            <Select name="consultantId" defaultValue={defaultConsultantId ?? undefined} required>
              <SelectTrigger id="consultantId" className="w-full">
                <SelectValue placeholder="Select a consultant" />
              </SelectTrigger>
              <SelectContent>
                {consultants.map((consultant) => (
                  <SelectItem key={consultant.id} value={consultant.id}>
                    {consultant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="self-end">
            {isPending ? "Saving..." : "Confirm Schedule"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
