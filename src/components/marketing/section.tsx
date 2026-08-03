import { cn } from "@/lib/utils";

export function Section({
  className,
  containerClassName,
  children,
  ...props
}: React.ComponentProps<"section"> & { containerClassName?: string }) {
  return (
    <section className={cn("py-16 sm:py-20", className)} {...props}>
      <div className={cn("mx-auto max-w-6xl px-4 sm:px-6 lg:px-8", containerClassName)}>
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  invert = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  invert?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      {eyebrow && (
        <span className="text-xs font-semibold tracking-wide text-accent uppercase">
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          "mt-2 text-3xl font-semibold tracking-tight sm:text-4xl",
          invert ? "text-white" : "text-foreground",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-4", invert ? "text-white/70" : "text-muted-foreground")}>
          {description}
        </p>
      )}
    </div>
  );
}
