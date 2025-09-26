import * as React from "react";

import { cn } from "@/lib/utils";

export function LogoMark({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M8 6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z"
        fill="#FF5722"
      />
      <path
        d="M14 10L18 14M18 10L14 14"
        stroke="#0D47A1"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 18L18 22M18 18L14 22"
        stroke="#0D47A1"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
