"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScheduleFormDialog } from "@/components/shared/schedule-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";

type ScheduleRow = {
  id: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  consultantName: string;
};

export function SchedulesSection({
  projectId,
  projectName,
  consultantId,
  schedules,
  consultants,
  canManage,
}: {
  projectId: string;
  projectName: string;
  consultantId: string;
  schedules: ScheduleRow[];
  consultants: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <h2 className="font-heading text-base font-semibold">Scheduled Events</h2>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <CalendarPlus className="size-4" />
            Add to Calendar
          </Button>
        )}
      </div>

      {schedules.length === 0 ? (
        <EmptyState className="border-none" title="No scheduled events yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {schedules.map((schedule) => (
            <li key={schedule.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{schedule.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(schedule.startAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · {schedule.consultantName}
                </p>
              </div>
              <Badge variant="outline">{schedule.type.replace(/_/g, " ")}</Badge>
            </li>
          ))}
        </ul>
      )}

      <ScheduleFormDialog
        open={open}
        onOpenChange={setOpen}
        target={{ type: "project", projectId }}
        defaultTitle={projectName}
        defaultConsultantId={consultantId}
        consultants={consultants}
      />
    </div>
  );
}
