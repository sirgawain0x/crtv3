"use client";

import { cn } from "@/lib/utils/utils";

interface AnimatedMenuIconProps {
  isOpen: boolean;
  className?: string;
}

export function AnimatedMenuIcon({ isOpen, className }: AnimatedMenuIconProps) {
  return (
    <span
      className={cn("relative flex h-6 w-6 items-center justify-center", className)}
      aria-hidden
    >
      <span className="absolute h-6 w-6">
        <span
          className={cn(
            "absolute left-1/2 top-[6px] block h-0.5 w-5 -translate-x-1/2 rounded-full bg-current",
            "transition-all duration-300 ease-in-out",
            isOpen ? "top-1/2 -translate-y-1/2 rotate-45" : ""
          )}
        />
        <span
          className={cn(
            "absolute left-1/2 top-1/2 block h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current",
            "transition-all duration-300 ease-in-out",
            isOpen ? "scale-x-0 opacity-0" : "opacity-100"
          )}
        />
        <span
          className={cn(
            "absolute left-1/2 top-[18px] block h-0.5 w-5 -translate-x-1/2 rounded-full bg-current",
            "transition-all duration-300 ease-in-out",
            isOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : ""
          )}
        />
      </span>
    </span>
  );
}
