import { cn } from "@/lib/utils";

const CLOUDS = [
  { top: "10%", left: "-10%", size: "18rem", delay: "0s", duration: "80s" },
  { top: "30%", left: "50%", size: "22rem", delay: "-20s", duration: "95s" },
  { top: "55%", left: "10%", size: "16rem", delay: "-40s", duration: "70s" },
] as const;

const STARS = [
  { top: "12%", left: "20%", delay: "0s" },
  { top: "22%", left: "70%", delay: "0.5s" },
  { top: "35%", left: "40%", delay: "1s" },
  { top: "18%", left: "85%", delay: "1.5s" },
  { top: "48%", left: "15%", delay: "2s" },
  { top: "60%", left: "60%", delay: "0.8s" },
  { top: "70%", left: "30%", delay: "1.3s" },
  { top: "40%", left: "90%", delay: "1.8s" },
] as const;

export function AnimatedSky({ variant = "full" }: { variant?: "full" | "subtle" }) {
  const subtle = variant === "subtle";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "sky-parallax pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        subtle ? "opacity-40" : "opacity-100"
      )}
    >
      {/* Light sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-mist to-sand dark:hidden">
        <div className="sky-glow absolute -top-20 right-[10%] size-96 rounded-full bg-white/60 blur-3xl" />
        {!subtle &&
          CLOUDS.map((cloud, i) => (
            <div
              key={i}
              className="sky-cloud absolute rounded-full bg-white/50 blur-3xl"
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

      {/* Dark night sky */}
      <div className="absolute inset-0 hidden bg-gradient-to-b from-deep-sea to-background dark:block">
        <div className="sky-glow absolute -top-16 left-[15%] size-80 rounded-full bg-harbor/20 blur-3xl" />
        {STARS.map((star, i) => (
          <div
            key={i}
            className="star-dot absolute size-1 rounded-full bg-white"
            style={{ top: star.top, left: star.left, animationDelay: star.delay }}
          />
        ))}
        {!subtle &&
          CLOUDS.slice(0, 2).map((cloud, i) => (
            <div
              key={`dark-${i}`}
              className="sky-cloud absolute rounded-full bg-white/5 blur-3xl"
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
    </div>
  );
}
