"use client";

import { format, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type CalendarViewMode = "month" | "week" | "day" | "agenda";

export function CalendarHeader({
  view,
  onViewChange,
  currentDate,
  onPrev,
  onNext,
  onToday,
  onDateSelect,
  modes = ["day", "week", "month"],
}: {
  view: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateSelect: (date: Date) => void;
  modes?: CalendarViewMode[];
}) {
  const label =
    view === "month"
      ? format(currentDate, "MMMM yyyy")
      : view === "week"
        ? `${format(startOfWeek(currentDate), "MMM d")} – ${format(endOfWeek(currentDate), "MMM d, yyyy")}`
        : format(currentDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label="Previous" onClick={onPrev}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next" onClick={onNext}>
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
            <Calendar mode="single" selected={currentDate} onSelect={(date) => date && onDateSelect(date)} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-1 rounded-lg bg-secondary/60 p-1">
        {modes.map((mode) => (
          <Button
            key={mode}
            variant={view === mode ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewChange(mode)}
            className="capitalize"
          >
            {mode}
          </Button>
        ))}
      </div>
    </div>
  );
}
