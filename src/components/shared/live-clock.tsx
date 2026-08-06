"use client";

import { useEffect, useState } from "react";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  month: "long",
  day: "numeric",
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

export function LiveClock() {
  const [now, setNow] = useState<Date>();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  if (!now) return null;

  return (
    <p className="truncate text-xs text-muted-foreground">
      {now.toLocaleDateString("en-US", DATE_FORMAT)}
      <span className="mx-1.5 text-muted-foreground/40">·</span>
      {now.toLocaleTimeString("en-US", TIME_FORMAT)}
    </p>
  );
}
