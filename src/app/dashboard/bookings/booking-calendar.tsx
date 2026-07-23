"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CalendarBooking = {
  id: string;
  customerName: string;
  serviceName: string;
  status: string;
  preferredDate: string; // ISO date string, YYYY-MM-DD prefix used as key
  preferredTime: string | null;
};

type ViewMode = "month" | "week" | "day";

const STATUS_DOT: Record<string, string> = {
  NEW: "bg-navy",
  REVIEWING: "bg-gold",
  SCHEDULED: "bg-ocean",
  IN_PROGRESS: "bg-ocean",
  COMPLETED: "bg-muted-foreground",
  CANCELLED: "bg-destructive",
};

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function BookingCalendar({ bookings }: { bookings: CalendarBooking[] }) {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const booking of bookings) {
      const key = booking.preferredDate.slice(0, 10);
      const existing = map.get(key);
      if (existing) existing.push(booking);
      else map.set(key, [booking]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.preferredTime ?? "").localeCompare(b.preferredTime ?? ""));
    }
    return map;
  }, [bookings]);

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

  const label =
    view === "month"
      ? format(currentDate, "MMMM yyyy")
      : view === "week"
        ? `${format(startOfWeek(currentDate), "MMM d")} – ${format(endOfWeek(currentDate), "MMM d, yyyy")}`
        : format(currentDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" aria-label="Previous" onClick={goPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Next" onClick={goNext}>
            <ChevronRight className="size-4" />
          </Button>
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="sm">
                  <CalendarIcon className="size-4" />
                  {label}
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && setCurrentDate(date)}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-1 rounded-lg bg-secondary/60 p-1">
          {(["day", "week", "month"] as const).map((mode) => (
            <Button
              key={mode}
              variant={view === mode ? "default" : "ghost"}
              size="sm"
              onClick={() => setView(mode)}
              className="capitalize"
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {view === "month" && (
          <MonthGrid currentDate={currentDate} bookingsByDate={bookingsByDate} onSelectDay={goToDay} />
        )}
        {view === "week" && (
          <WeekList currentDate={currentDate} bookingsByDate={bookingsByDate} onSelectDay={goToDay} />
        )}
        {view === "day" && (
          <DayList bookings={bookingsByDate.get(dateKey(currentDate)) ?? []} />
        )}
      </div>
    </div>
  );
}

function MonthGrid({
  currentDate,
  bookingsByDate,
  onSelectDay,
}: {
  currentDate: Date;
  bookingsByDate: Map<string, CalendarBooking[]>;
  onSelectDay: (date: Date) => void;
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
        const dayBookings = bookingsByDate.get(dateKey(day)) ?? [];
        const inMonth = isSameMonth(day, currentDate);
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDay(day)}
            className={cn(
              "min-h-24 bg-card p-1.5 text-left align-top transition-colors hover:bg-secondary/40",
              !inMonth && "bg-muted/40 text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full text-xs",
                isToday(day) && "bg-navy font-semibold text-white",
              )}
            >
              {format(day, "d")}
            </span>
            <div className="mt-1 flex flex-col gap-0.5">
              {dayBookings.slice(0, 2).map((booking) => (
                <div key={booking.id} className="flex items-center gap-1 truncate text-[11px]">
                  <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[booking.status])} />
                  <span className="truncate">{booking.customerName}</span>
                </div>
              ))}
              {dayBookings.length > 2 && (
                <span className="text-[11px] text-muted-foreground">
                  +{dayBookings.length - 2} more
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function WeekList({
  currentDate,
  bookingsByDate,
  onSelectDay,
}: {
  currentDate: Date;
  bookingsByDate: Map<string, CalendarBooking[]>;
  onSelectDay: (date: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(currentDate),
    end: endOfWeek(currentDate),
  });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const dayBookings = bookingsByDate.get(dateKey(day)) ?? [];
        return (
          <div key={day.toISOString()} className="rounded-lg border border-border p-2">
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className="mb-2 flex w-full items-center justify-between text-left"
            >
              <span className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</span>
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-navy font-semibold text-white",
                )}
              >
                {format(day, "d")}
              </span>
            </button>
            <div className="flex flex-col gap-1.5">
              {dayBookings.length === 0 && (
                <p className="text-xs text-muted-foreground">No bookings</p>
              )}
              {dayBookings.map((booking) => (
                <div key={booking.id} className="rounded-md bg-secondary/50 p-1.5 text-xs">
                  <div className="flex items-center gap-1">
                    <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[booking.status])} />
                    <span className="font-medium text-foreground">{booking.customerName}</span>
                  </div>
                  <p className="truncate text-muted-foreground">{booking.serviceName}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({ bookings }: { bookings: CalendarBooking[] }) {
  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">No bookings for this day.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {bookings.map((booking) => (
        <div key={booking.id} className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm text-muted-foreground">
              {booking.preferredTime ?? "—"}
            </span>
            <div>
              <p className="font-medium text-foreground">{booking.customerName}</p>
              <p className="text-sm text-muted-foreground">{booking.serviceName}</p>
            </div>
          </div>
          <Badge variant="outline">{booking.status.replace(/_/g, " ")}</Badge>
        </div>
      ))}
    </div>
  );
}
