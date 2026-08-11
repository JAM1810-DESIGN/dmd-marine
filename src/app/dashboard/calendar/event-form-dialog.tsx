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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { notify } from "@/lib/notify";
import { createSchedule, updateSchedule, deleteSchedule } from "./actions";

const SCHEDULE_TYPES = ["CONSULTATION", "SURVEY", "INSPECTION", "TRAINING", "OTHER"] as const;

export type EditableEvent = {
  id: string;
  title: string;
  type: string;
  startAt: string; // ISO
  endAt: string; // ISO
  consultantId: string;
  notes: string | null;
};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventFormDialog({
  open,
  onOpenChange,
  consultants,
  event,
  presetDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultants: { id: string; name: string }[];
  event?: EditableEvent;
  presetDate?: Date | null;
}) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState(event?.type ?? "CONSULTATION");
  const [consultantId, setConsultantId] = useState(event?.consultantId ?? "");
  const typeItems = SCHEDULE_TYPES.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }));
  const consultantItems = consultants.map((c) => ({ value: c.id, label: c.name }));

  let defaultStart = "";
  let defaultEnd = "";
  if (event) {
    defaultStart = toLocalInputValue(new Date(event.startAt));
    defaultEnd = toLocalInputValue(new Date(event.endAt));
  } else if (presetDate) {
    const base = new Date(presetDate);
    base.setHours(9, 0, 0, 0);
    defaultStart = toLocalInputValue(base);
    defaultEnd = toLocalInputValue(new Date(base.getTime() + 60 * 60 * 1000));
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = event
        ? await updateSchedule(event.id, {}, formData)
        : await createSchedule({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      notify.success(event ? "Event updated" : "Event created");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={event?.title} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="type">Type</Label>
            <Select
              name="type"
              items={typeItems}
              value={type}
              onValueChange={(v) => { if (typeof v === "string") setType(v); }}
              required
            >
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
            <Select
              name="consultantId"
              items={consultantItems}
              value={consultantId}
              onValueChange={(v) => { if (typeof v === "string") setConsultantId(v); }}
              required
            >
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
            <Textarea id="notes" name="notes" rows={2} defaultValue={event?.notes ?? ""} />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <div className="flex items-center justify-between">
            {event ? (
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="outline" className="text-destructive">
                    Delete
                  </Button>
                }
                title={`Delete "${event.title}"?`}
                description="This removes the event from the calendar. This can't be undone."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={async () => {
                  const result = await deleteSchedule(event.id);
                  if (result.error) notify.error(result.error);
                  else {
                    notify.success("Event deleted");
                    onOpenChange(false);
                  }
                }}
              />
            ) : (
              <span />
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : event ? "Save" : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
