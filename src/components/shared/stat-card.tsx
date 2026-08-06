import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/shared/count-up";
import { cn } from "@/lib/utils";

const TONE_CHIP_CLASSES = {
  primary: "bg-gradient-to-br from-primary/15 to-primary/5 text-primary",
  accent: "bg-gradient-to-br from-accent/15 to-accent/5 text-accent",
  info: "bg-gradient-to-br from-info/15 to-info/5 text-info",
  success: "bg-gradient-to-br from-success/15 to-success/5 text-success",
} as const;

const TONE_TEXT_CLASSES = {
  primary: "text-primary",
  accent: "text-accent",
  info: "text-info",
  success: "text-success",
} as const;

const TONE_CHIP_DARK_CLASSES = {
  primary: "bg-white/15 text-sidebar-primary",
  accent: "bg-white/15 text-sidebar-primary",
  info: "bg-white/15 text-sidebar-primary",
  success: "bg-white/15 text-sidebar-primary",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  href,
  subtitle,
  emptyLabel,
  trend,
  tone = "primary",
  dark = false,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  href?: string;
  subtitle?: string;
  emptyLabel?: string;
  trend?: { direction: "up" | "down"; label: string };
  tone?: keyof typeof TONE_CHIP_CLASSES;
  dark?: boolean;
  className?: string;
}) {
  const isZero = typeof value === "number" && value === 0;

  const content = (
    <Card
      interactive={!!href}
      className={cn(
        "group gap-3",
        dark
          ? "border-white/15 bg-white/10 shadow-none ring-white/15 backdrop-blur-md"
          : "bg-card/85 backdrop-blur-sm",
        className,
      )}
    >
      <CardHeader className="flex-row items-start justify-between">
        <div className="space-y-0.5">
          <CardDescription
            className={cn("font-medium", dark ? "text-white/70" : "text-foreground/70")}
          >
            {label}
          </CardDescription>
          {subtitle && (
            <p className={cn("text-xs", dark ? "text-white/50" : "text-muted-foreground")}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            dark ? TONE_CHIP_DARK_CLASSES[tone] : TONE_CHIP_CLASSES[tone],
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
      </CardHeader>
      <div className="flex items-end justify-between px-(--card-spacing)">
        <div>
          <CardTitle
            className={cn(
              "text-[1.75rem] tabular-nums",
              dark ? "text-white" : TONE_TEXT_CLASSES[tone],
            )}
          >
            {typeof value === "number" ? <CountUp value={value} /> : value}
          </CardTitle>
          {isZero && emptyLabel ? (
            <p className={cn("mt-1 text-xs", dark ? "text-white/50" : "text-muted-foreground")}>
              {emptyLabel}
            </p>
          ) : (
            trend && (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  trend.direction === "up" ? "text-success" : "text-destructive",
                )}
              >
                {trend.direction === "up" ? "↑" : "↓"} {trend.label}
              </p>
            )
          )}
        </div>
        {href && (
          <ArrowRight
            className={cn(
              "mb-1 size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
              dark
                ? "text-white/40 group-hover:text-white/70"
                : "text-muted-foreground/50 group-hover:text-muted-foreground",
            )}
          />
        )}
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
