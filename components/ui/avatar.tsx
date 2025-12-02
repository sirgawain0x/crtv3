"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils/utils";
import { convertFailingGateway, getImageUrlWithFallback } from "@/lib/utils/image-gateway";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
    src?: string;
  }
>(({ className, src, onError, ...props }, ref) => {
  // Normalize src: treat empty strings as undefined for consistency
  const normalizedSrc = src && src.trim() !== '' ? src : undefined;
  
  // Convert failing gateways on initial load
  const initialSrc = normalizedSrc ? convertFailingGateway(normalizedSrc) : undefined;
  const [imageSrc, setImageSrc] = React.useState(initialSrc);
  const [fallbackIndex, setFallbackIndex] = React.useState(0);

  // Get fallbacks for current src (recalculated when src changes)
  const { fallbacks } = React.useMemo(
    () => getImageUrlWithFallback(normalizedSrc || ''),
    [normalizedSrc]
  );

  // Update image source when src prop changes (handles both truthy and falsy cases)
  React.useEffect(() => {
    if (normalizedSrc) {
      const converted = convertFailingGateway(normalizedSrc);
      setImageSrc(converted);
    } else {
      // Clear image source when src becomes falsy
      setImageSrc(undefined);
    }
    // Reset fallback index when src changes
    setFallbackIndex(0);
  }, [normalizedSrc]);

  const handleError = React.useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Try fallback gateways if available
    if (fallbacks.length > fallbackIndex) {
      console.log(`Avatar image failed, trying fallback gateway ${fallbackIndex + 1}/${fallbacks.length}`);
      setImageSrc(fallbacks[fallbackIndex]);
      setFallbackIndex((prev) => prev + 1);
      return;
    }

    // If all fallbacks exhausted, call original onError handler
    if (onError) {
      onError(e);
    }
  }, [fallbacks, fallbackIndex, onError]);

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={imageSrc}
      onError={handleError}
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
