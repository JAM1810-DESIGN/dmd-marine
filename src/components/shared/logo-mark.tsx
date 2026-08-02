import type { ComponentProps } from "react";

export function LogoMark(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="11" r="8.25" />
      <circle cx="12" cy="6.25" r="1.25" />
      <path d="M12 7.5v10" />
      <path d="M9 10h6" />
      <path d="M7.5 14a4.5 4.5 0 0 0 9 0" />
      <path d="M5 20c1.2-.8 2.4-.8 3.6 0s2.4.8 3.6 0 2.4-.8 3.6 0 2.4.8 3.6 0" />
    </svg>
  );
}
