"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { convertFailingGateway, getImageUrlWithFallback, isIpfsUrl } from '@/lib/utils/image-gateway';
import { Skeleton } from '@/components/ui/skeleton';
import type { ImageProps } from 'next/image';

interface GatewayImageProps extends Omit<ImageProps, 'src' | 'onLoad'> {
  src: string;
  fallbackSrc?: string;
  showSkeleton?: boolean;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Enhanced Image component that automatically handles IPFS gateway fallbacks
 * Converts failing gateways (Lighthouse, etc.) to alternative gateways
 * Uses unoptimized for IPFS images to avoid Next.js optimization timeouts
 * Shows skeleton loader while image loads
 */
export function GatewayImage({
  src,
  fallbackSrc,
  onError,
  unoptimized,
  showSkeleton = true,
  className,
  onLoad: onLoadProp,
  ...props
}: GatewayImageProps) {
  const { fill } = props;
  const [imageSrc, setImageSrc] = useState(() => {
    // Convert failing gateways on initial load
    if (src && convertFailingGateway(src) !== src) {
      return convertFailingGateway(src);
    }
    return src;
  });
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sync imageSrc state when src prop changes (e.g., when parent updates thumbnailUrl)
  useEffect(() => {
    // Convert failing gateways when src prop changes
    const convertedSrc = src && convertFailingGateway(src) !== src 
      ? convertFailingGateway(src) 
      : (src || '');
    
    // Update imageSrc when src prop changes and reset fallback state
    setImageSrc(convertedSrc);
    setFallbackIndex(0);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  // Get fallbacks, but exclude the gateway that's already being used in imageSrc
  // This prevents retrying the same gateway when it fails.
  // 
  // Issue: When src is ipfs:// protocol, convertFailingGateway converts it to Lighthouse,
  // but getAllIpfsGateways also generates Lighthouse as the first gateway. This causes
  // imageSrc to be Lighthouse, and if primary is also Lighthouse, we'd retry the same URL.
  // 
  // Solution: Filter out any fallback that matches imageSrc, and also exclude primary
  // if it matches imageSrc (though primary shouldn't be in fallbacks array normally).
  const { primary, fallbacks: allFallbacks } = getImageUrlWithFallback(src);
  const fallbacks = allFallbacks.filter(fallback => {
    // Exclude any fallback that matches the current imageSrc
    // This prevents wasting a retry attempt on the same URL
    return fallback !== imageSrc;
  });
  
  // Also check if primary matches imageSrc - if so, we should skip it
  // (though primary shouldn't be in fallbacks, this is a safety check)
  // Note: We don't add primary to fallbacks because it's already being used as imageSrc
  const isIpfs = isIpfsUrl(imageSrc);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Try fallback URLs if available
    if (fallbacks.length > fallbackIndex) {
      console.log(`Trying fallback gateway ${fallbackIndex + 1}/${fallbacks.length} for IPFS image`);
      setImageSrc(fallbacks[fallbackIndex]);
      setFallbackIndex((prev) => prev + 1);
      setIsLoading(true); // Reset loading state for new URL
      return;
    }

    // If all fallbacks exhausted, try the fallbackSrc prop
    if (fallbackSrc && imageSrc !== fallbackSrc && !hasError) {
      setHasError(true);
      setImageSrc(fallbackSrc);
      setIsLoading(true); // Reset loading state for new URL
      return;
    }

    setIsLoading(false);

    // Call original onError handler if provided
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    if (onLoadProp) {
      onLoadProp(event);
    }
  };

  // Use unoptimized for IPFS images to avoid Next.js optimization timeouts
  // IPFS images are already optimized and don't need Next.js processing
  // Blob URLs (local previews) must also be unoptimized as Next.js cannot optimize them
  const isBlob = imageSrc?.startsWith('blob:');
  const shouldUnoptimize = unoptimized !== undefined ? unoptimized : (isIpfs || isBlob);

  return (
    <div className={`relative ${fill ? 'w-full h-full' : ''}`}>
      {showSkeleton && isLoading && (
        <Skeleton className={className || "w-full h-full absolute inset-0"} />
      )}
      <Image
        src={imageSrc}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized={shouldUnoptimize}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'
          } ${className || ''}`}
        {...props}
      />
    </div>
  );
}

