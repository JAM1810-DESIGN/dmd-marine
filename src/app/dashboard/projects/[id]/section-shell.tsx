import { cn } from "@/lib/utils";

type Tone = "blue" | "gold" | "teal" | "purple" | "gray";

const TONES: Record<Tone, { bar: string; chip: string; count: string }> = {
  blue: {
    bar: "bg-blue-500",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    count: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  gold: {
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    count: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  },
  teal: {
    bar: "bg-teal-500",
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    count: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  },
  purple: {
    bar: "bg-violet-500",
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    count: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  gray: {
    bar: "bg-neutral-400",
    chip: "bg-neutral-100 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-300",
    count: "bg-neutral-100 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-300",
  },
};

/** A project-detail section card with a color-coded top bar, icon chip, and header. */
export function SectionShell({
  tone,
  icon: Icon,
  title,
  description,
  count,
  action,
  children,
}: {
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  count?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = TONES[tone];
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className={cn("h-[3px]", c.bar)} />
      <div className="flex items-center gap-3 border-b border-border p-4">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", c.chip)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {count && (
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", c.count)}>{count}</span>
        )}
        {action}
      </div>
      {children}
    </div>
  );
}
