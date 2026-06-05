import type { ButtonProps } from "@/components/ui/button";

export const navIconButtonProps = {
  variant: "outline",
  size: "icon",
} as const satisfies Pick<ButtonProps, "variant" | "size">;
