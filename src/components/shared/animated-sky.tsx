import { cn } from "@/lib/utils";

const CLOUDS = [
  { top: "10%", left: "-10%", size: "18rem", delay: "0s", duration: "80s" },
  { top: "30%", left: "50%", size: "22rem", delay: "-20s", duration: "95s" },
  { top: "55%", left: "10%", size: "16rem", delay: "-40s", duration: "70s" },
] as const;

const GLOW_DOTS = [
  { top: "12%", left: "20%", delay: "0s" },
  { top: "22%", left: "70%", delay: "0.5s" },
  { top: "35%", left: "40%", delay: "1s" },
  { top: "18%", left: "85%", delay: "1.5s" },
  { top: "48%", left: "15%", delay: "2s" },
  { top: "60%", left: "60%", delay: "0.8s" },
  { top: "70%", left: "30%", delay: "1.3s" },
  { top: "40%", left: "90%", delay: "1.8s" },
] as const;

function BioluminescentScene({ subtle }: { subtle: boolean }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-sidebar to-sidebar-accent">
      <div className="sky-glow absolute -top-16 left-[15%] size-80 rounded-full bg-sidebar-primary/20 blur-3xl" />
      {GLOW_DOTS.map((dot, i) => (
        <div
          key={i}
          className={cn(
            "star-dot absolute size-1 rounded-full",
            i % 2 === 0 ? "bg-sidebar-primary" : "bg-accent"
          )}
          style={{ top: dot.top, left: dot.left, animationDelay: dot.delay }}
        />
      ))}
      {!subtle &&
        CLOUDS.slice(0, 2).map((cloud, i) => (
          <div
            key={`glow-${i}`}
            className="sky-cloud absolute rounded-full bg-sidebar-primary/5 blur-3xl"
            style={{
              top: cloud.top,
              left: cloud.left,
              width: cloud.size,
              height: cloud.size,
              animationDelay: cloud.delay,
              animationDuration: cloud.duration,
            }}
          />
        ))}
    </div>
  );
}

export function AnimatedSky({ variant = "full" }: { variant?: "full" | "subtle" }) {
  const subtle = variant === "subtle";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "sky-parallax pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        subtle ? "opacity-35" : "opacity-100"
      )}
    >
      {/* Toned teal wash — light mode */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary to-background dark:hidden">
        <div className="sky-glow absolute -top-20 right-[10%] size-96 rounded-full bg-white/60 blur-3xl" />
      </div>
      {/* Full bioluminescent glow — dark mode */}
      <div className="absolute inset-0 hidden dark:block">
        <BioluminescentScene subtle={subtle} />
      </div>
    </div>
  );
}
