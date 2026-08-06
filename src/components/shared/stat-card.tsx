import type { ComponentType } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/shared/count-up";
import { cn } from "@/lib/utils";

const TONE_CHIP_CLASSES = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
} as const;

const TONE_TEXT_CLASSES = {
  primary: "text-primary",
  accent: "text-accent",
  warning: "text-warning",
  success: "text-success",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  href,
  trend,
  tone = "primary",
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  href?: string;
  trend?: { direction: "up" | "down"; label: string };
  tone?: keyof typeof TONE_CHIP_CLASSES;
  className?: string;
}) {
  const content = (
    <Card interactive={!!href} className={cn("gap-2", className)}>
      <CardHeader className="flex-row items-center justify-between">
        <CardDescription>{label}</CardDescription>
        <div className={cn("flex size-8 items-center justify-center rounded-lg", TONE_CHIP_CLASSES[tone])}>
          <Icon className="size-4" aria-hidden />
        </div>
      </CardHeader>
      <div className="px-(--card-spacing)">
        <CardTitle className={cn("text-2xl", TONE_TEXT_CLASSES[tone])}>
          {typeof value === "number" ? <CountUp value={value} /> : value}
        </CardTitle>
        {trend && (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              trend.direction === "up" ? "text-success" : "text-destructive"
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.label}
          </p>
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
