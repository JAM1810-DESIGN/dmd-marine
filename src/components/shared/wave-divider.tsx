// src/components/shared/wave-divider.tsx
import { cn } from "@/lib/utils";

export function WaveDivider({
  className,
  fillClassName = "fill-background",
}: {
  className?: string;
  fillClassName?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("w-full overflow-hidden leading-none", className)}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="h-16 w-full sm:h-20">
        <path
          d="M0,32 C240,80 480,0 720,24 C960,48 1200,80 1440,32 L1440,80 L0,80 Z"
          className={fillClassName}
        />
      </svg>
    </div>
  );
}
