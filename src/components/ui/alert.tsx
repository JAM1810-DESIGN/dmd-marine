import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex w-full gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        info: "border-border bg-secondary text-secondary-foreground [&>svg]:text-primary",
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warning/20 bg-warning/10 text-warning",
        error: "border-destructive/20 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium leading-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
