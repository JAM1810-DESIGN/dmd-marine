import Image from "next/image";
import { cn } from "@/lib/utils";

// Icon-only crop (wordmark text removed from below it) and a separate crop
// of just that wordmark text, both with transparent backgrounds so they sit
// directly on any surface. The icon's ink is navy; on dark surfaces (the
// always-dark sidebar, or the website navbar in dark mode) that reads as
// nearly invisible, so light-recolored variants of both exist for those
// spots. `themed` renders both variants stacked with Tailwind's `dark:`
// variant so it swaps automatically with the site's light/dark toggle,
// instead of a fixed `light` choice (used for the always-dark sidebar).
const ICON_ASPECT_RATIO = 1254 / 655;
const WORDMARK_ASPECT_RATIO = 837 / 136;

function ThemedImage({
  src,
  lightSrc,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  lightSrc: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn("shrink-0 object-contain dark:hidden", className)}
        priority
      />
      <Image
        src={lightSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn("hidden shrink-0 object-contain dark:block", className)}
        priority
      />
    </>
  );
}

export function LogoImage({
  size = 32,
  light = false,
  themed = false,
  className,
}: {
  size?: number;
  light?: boolean;
  themed?: boolean;
  className?: string;
}) {
  const width = Math.round(size * ICON_ASPECT_RATIO);

  if (themed) {
    return (
      <ThemedImage
        src="/logo-dmd-marine-icon.png"
        lightSrc="/logo-dmd-marine-icon-light.png"
        alt="DMD Marine"
        width={width}
        height={size}
        className={className}
      />
    );
  }

  return (
    <Image
      src={light ? "/logo-dmd-marine-icon-light.png" : "/logo-dmd-marine-icon.png"}
      alt="DMD Marine"
      width={width}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      priority
    />
  );
}

export function LogoLockup({
  iconSize = 32,
  light = false,
  themed = false,
  className,
}: {
  iconSize?: number;
  light?: boolean;
  themed?: boolean;
  className?: string;
}) {
  const wordmarkHeight = Math.round(iconSize * 0.5);
  const wordmarkWidth = Math.round(wordmarkHeight * WORDMARK_ASPECT_RATIO);

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2", className)}>
      <LogoImage size={iconSize} light={light} themed={themed} />
      {themed ? (
        <ThemedImage
          src="/logo-dmd-marine-wordmark.png"
          lightSrc="/logo-dmd-marine-wordmark-light.png"
          alt="DMD Marine — Consultation and Services"
          width={wordmarkWidth}
          height={wordmarkHeight}
        />
      ) : (
        <Image
          src={light ? "/logo-dmd-marine-wordmark-light.png" : "/logo-dmd-marine-wordmark.png"}
          alt="DMD Marine — Consultation and Services"
          width={wordmarkWidth}
          height={wordmarkHeight}
          className="shrink-0 object-contain"
          priority
        />
      )}
    </span>
  );
}
