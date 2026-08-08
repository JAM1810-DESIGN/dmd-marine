"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarHeader, type CalendarViewMode } from "@/components/shared/calendar-header";
import { cn } from "@/lib/utils";
import { EventFormDialog, type EditableEvent } from "./event-form-dialog";

export type CalendarSchedule = {
  id: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  consultantId: string;
  consultantName: string;
  notes: string | null;
  bookingId: string | null;
  bookingCustomer: string | null;
  projectId: string | null;
  projectName: string | null;
};

const TYPE_META: Record<string, { label: string; dot: string }> = {
  CONSULTATION: { label: "Consultation", dot: "bg-navy" },
  SURVEY: { label: "Survey", dot: "bg-ocean" },
  INSPECTION: { label: "Inspection", dot: "bg-accent" },
  TRAINING: { label: "Training", dot: "bg-success" },
  OTHER: { label: "Other", dot: "bg-muted-foreground" },
};

const TYPE_ORDER = ["CONSULTATION", "SURVEY", "INSPECTION", "TRAINING", "OTHER"] as const;

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function toEditable(schedule: CalendarSchedule): EditableEvent {
  return {
    id: schedule.id,
    title: schedule.title,
    type: schedule.type,
    startAt: schedule.startAt,
    endAt: schedule.endAt,
    consultantId: schedule.consultantId,
    notes: schedule.notes,
  };
}

export function ScheduleCalendar({
  schedules,
  consultants,
  canManage,
}: {
  schedules: CalendarSchedule[];
  consultants: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [view, setView] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [consultantFilter, setConsultantFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dialog, setDialog] = useState<{ open: boolean; event?: EditableEvent; presetDate?: Date | null }>({
    open: false,
  });

  const filtered = useMemo(
    () =>
      schedules.filter((schedule) => {
        if (consultantFilter !== "ALL" && schedule.consultantId !== consultantFilter) return false;
        if (typeFilter !== "ALL" && schedule.type !== typeFilter) return false;
        return true;
      }),
    [schedules, consultantFilter, typeFilter],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarSchedule[]>();
    for (const schedule of filtered) {
      const key = dateKey(new Date(schedule.startAt));
      const existing = map.get(key);
      if (existing) existing.push(schedule);
      else map.set(key, [schedule]);
    }
    for (const list of map.values()) list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return map;
  }, [filtered]);

  function goPrev() {
    setCurrentDate((date) =>
      view === "day" ? subDays(date, 1) : view === "week" ? subWeeks(date, 1) : subMonths(date, 1),
    );
  }
  function goNext() {
    setCurrentDate((date) =>
      view === "day" ? addDays(date, 1) : view === "week" ? addWeeks(date, 1) : addMonths(date, 1),
    );
  }
  function goToDay(date: Date) {
    setCurrentDate(date);
    setView("day");
  }
  function openCreate(date: Date | null) {
    if (!canManage) return;
    setDialog({ open: true, event: undefined, presetDate: date });
  }
  function openEdit(schedule: CalendarSchedule) {
    setDialog({ open: true, event: toEditable(schedule), presetDate: null });
  }

  const eventProps = { canManage, onEdit: openEdit };

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <CalendarHeader
        view={view}
        onViewChange={setView}
        currentDate={currentDate}
        onPrev={goPrev}
        onNext={goNext}
        onToday={() => setCurrentDate(new Date())}
        onDateSelect={setCurrentDate}
        modes={["day", "week", "month", "agenda"]}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Select value={consultantFilter} onValueChange={(v) => setConsultantFilter(v ?? "ALL")}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All consultants</SelectItem>
              {consultants.map((consultant) => (
                <SelectItem key={consultant.id} value={consultant.id}>
                  {consultant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "ALL")}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {TYPE_ORDER.map((type) => (
                <SelectItem key={type} value={type}>
                  {TYPE_META[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => openCreate(null)}>
            <Plus className="size-4" />
            New Event
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-y border-border py-2">
        {TYPE_ORDER.map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-2 rounded-full", TYPE_META[type].dot)} />
            {TYPE_META[type].label}
          </span>
        ))}
      </div>

      <div className="mt-4">
        {view === "month" && (
          <MonthGrid currentDate={currentDate} byDate={byDate} onSelectDay={goToDay} onCreate={openCreate} {...eventProps} />
        )}
        {view === "week" && (
          <WeekList currentDate={currentDate} byDate={byDate} onSelectDay={goToDay} onCreate={openCreate} {...eventProps} />
        )}
        {view === "day" && (
          <DayList schedules={byDate.get(dateKey(currentDate)) ?? []} {...eventProps} />
        )}
        {view === "agenda" && <AgendaList schedules={filtered} {...eventProps} />}
      </div>

      {dialog.open && (
        <EventFormDialog
          open
          onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
          consultants={consultants}
          event={dialog.event}
          presetDate={dialog.presetDate}
        />
      )}
    </div>
  );
}

function EventChip({
  schedule,
  canManage,
  onEdit,
  compact = false,
}: {
  schedule: CalendarSchedule;
  canManage: boolean;
  onEdit: (schedule: CalendarSchedule) => void;
  compact?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "flex w-full items-center gap-1 truncate rounded-md bg-secondary/60 px-1.5 py-0.5 text-left hover:bg-secondary",
              compact ? "text-[11px]" : "text-xs",
            )}
          >
            <span className={cn("size-1.5 shrink-0 rounded-full", TYPE_META[schedule.type]?.dot)} />
            <span className="truncate">
              {format(new Date(schedule.startAt), "h:mm a")} {schedule.title}
            </span>
          </button>
        }
      />
      <PopoverContent className="w-64">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-foreground">{schedule.title}</p>
            <Badge variant="outline">{(TYPE_META[schedule.type]?.label ?? schedule.type)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(schedule.startAt), "EEE, MMM d · h:mm a")} –{" "}
            {format(new Date(schedule.endAt), "h:mm a")}
          </p>
          <p className="text-sm text-muted-foreground">{schedule.consultantName}</p>
          {schedule.notes && <p className="text-sm text-muted-foreground">{schedule.notes}</p>}
          {(schedule.projectId || schedule.bookingId) && (
            <div className="flex flex-col gap-1 border-t border-border pt-2 text-sm">
              {schedule.projectId && (
                <Link href={`/dashboard/projects/${schedule.projectId}`} className="text-ocean hover:underline">
                  View project: {schedule.projectName}
                </Link>
              )}
              {schedule.bookingId && (
                <Link href="/dashboard/bookings" className="text-ocean hover:underline">
                  From booking: {schedule.bookingCustomer}
                </Link>
              )}
            </div>
          )}
          {canManage && (
            <Button variant="outline" size="sm" className="mt-1 self-start" onClick={() => onEdit(schedule)}>
              Edit
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MonthGrid({
  currentDate,
  byDate,
  onSelectDay,
  onCreate,
  canManage,
  onEdit,
}: {
  currentDate: Date;
  byDate: Map<string, CalendarSchedule[]>;
  onSelectDay: (date: Date) => void;
  onCreate: (date: Date) => void;
  canManage: boolean;
  onEdit: (schedule: CalendarSchedule) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(currentDate));
  const gridEnd = endOfWeek(endOfMonth(currentDate));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div key={day} className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
          {day}
        </div>
      ))}
      {days.map((day) => {
        const dayEvents = byDate.get(dateKey(day)) ?? [];
        const inMonth = isSameMonth(day, currentDate);
        return (
          <div
            key={day.toISOString()}
            onClick={() => (canManage ? onCreate(day) : onSelectDay(day))}
            className={cn(
              "min-h-24 cursor-pointer bg-card p-1.5 align-top transition-colors hover:bg-secondary/40",
              !inMonth && "bg-muted/40 text-muted-foreground",
            )}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectDay(day);
              }}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full text-xs hover:bg-secondary",
                isToday(day) && "bg-navy font-semibold text-white hover:bg-navy",
              )}
            >
              {format(day, "d")}
            </button>
            <div className="mt-1 flex flex-col gap-0.5">
              {dayEvents.slice(0, 3).map((event) => (
                <EventChip key={event.id} schedule={event} canManage={canManage} onEdit={onEdit} compact />
              ))}
              {dayEvents.length > 3 && (
                <span className="pl-1 text-[11px] text-muted-foreground">+{dayEvents.length - 3} more</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekList({
  currentDate,
  byDate,
  onSelectDay,
  onCreate,
  canManage,
  onEdit,
}: {
  currentDate: Date;
  byDate: Map<string, CalendarSchedule[]>;
  onSelectDay: (date: Date) => void;
  onCreate: (date: Date) => void;
  canManage: boolean;
  onEdit: (schedule: CalendarSchedule) => void;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const dayEvents = byDate.get(dateKey(day)) ?? [];
        return (
          <div key={day.toISOString()} className="rounded-lg border border-border p-2">
            <div className="mb-2 flex w-full items-center justify-between">
              <button type="button" onClick={() => onSelectDay(day)} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                {format(day, "EEE")}
              </button>
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-navy font-semibold text-white",
                )}
              >
                {format(day, "d")}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {dayEvents.length === 0 && (
                canManage ? (
                  <button type="button" onClick={() => onCreate(day)} className="text-left text-xs text-muted-foreground hover:text-foreground">
                    + Add event
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground">No events</p>
                )
              )}
              {dayEvents.map((event) => (
                <EventChip key={event.id} schedule={event} canManage={canManage} onEdit={onEdit} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({
  schedules,
  canManage,
  onEdit,
}: {
  schedules: CalendarSchedule[];
  canManage: boolean;
  onEdit: (schedule: CalendarSchedule) => void;
}) {
  if (schedules.length === 0) {
    return <p className="text-sm text-muted-foreground">No scheduled events for this day.</p>;
  }
  return (
    <div className="flex flex-col divide-y divide-border">
      {schedules.map((event) => (
        <div key={event.id} className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm text-muted-foreground">
              {format(new Date(event.startAt), "h:mm a")}
            </span>
            <div>
              <p className="font-medium text-foreground">{event.title}</p>
              <p className="text-sm text-muted-foreground">{event.consultantName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", TYPE_META[event.type]?.dot)} />
              <Badge variant="outline">{TYPE_META[event.type]?.label ?? event.type}</Badge>
            </span>
            {canManage && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(event)}>
                Edit
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AgendaList({
  schedules,
  canManage,
  onEdit,
}: {
  schedules: CalendarSchedule[];
  canManage: boolean;
  onEdit: (schedule: CalendarSchedule) => void;
}) {
  const now = new Date();
  const upcoming = schedules
    .filter((schedule) => new Date(schedule.endAt) >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 50);

  if (upcoming.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming events.</p>;
  }

  const groups: { date: Date; items: CalendarSchedule[] }[] = [];
  for (const schedule of upcoming) {
    const start = new Date(schedule.startAt);
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.date, start)) last.items.push(schedule);
    else groups.push({ date: start, items: [schedule] });
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.date.toISOString()}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isToday(group.date) ? "Today · " : ""}
            {format(group.date, "EEEE, MMM d")}
          </p>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {group.items.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm text-muted-foreground">
                    {format(new Date(event.startAt), "h:mm a")}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.consultantName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", TYPE_META[event.type]?.dot)} />
                  {canManage && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(event)}>
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
