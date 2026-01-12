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
  
  // Use ref to track current fallback index to avoid stale closures in handleError
  const fallbackIndexRef = React.useRef(0);
  // Track if all gateways have been exhausted to prevent infinite retries
  const allGatewaysExhaustedRef = React.useRef(false);

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
    fallbackIndexRef.current = 0;
    // Reset exhausted flag when src changes
    allGatewaysExhaustedRef.current = false;
  }, [normalizedSrc]);

  const handleError = React.useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Prevent infinite retries if all gateways have been exhausted
    if (allGatewaysExhaustedRef.current) {
      if (onError) {
        onError(e);
      }
      return;
    }

    // Use ref to get current fallback index value (avoids stale closure issues)
    const currentIndex = fallbackIndexRef.current;
    
    // Try fallback gateways if available
    if (fallbacks.length > currentIndex) {
      console.log(`Avatar image failed, trying fallback gateway ${currentIndex + 1}/${fallbacks.length}`);
      setImageSrc(fallbacks[currentIndex]);
      const nextIndex = currentIndex + 1;
      setFallbackIndex(nextIndex);
      fallbackIndexRef.current = nextIndex;
      return;
    }

    // All fallback gateways have been exhausted
    allGatewaysExhaustedRef.current = true;

    // If all fallbacks exhausted, call original onError handler
    // Radix UI Avatar will automatically show the fallback component
    if (onError) {
      onError(e);
    }
  }, [fallbacks, onError]);

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
