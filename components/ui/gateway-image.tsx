"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { convertFailingGateway, getImageUrlWithFallback, isIpfsUrl } from '@/lib/utils/image-gateway';
import { Skeleton } from '@/components/ui/skeleton';
import type { ImageProps } from 'next/image';

interface GatewayImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
  showSkeleton?: boolean;
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
  onLoadingComplete,
  ...props 
}: GatewayImageProps) {
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

  const { fallbacks } = getImageUrlWithFallback(src);
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

  const handleLoadingComplete = (result: any) => {
    setIsLoading(false);
    if (onLoadingComplete) {
      onLoadingComplete(result);
    }
  };

  // Use unoptimized for IPFS images to avoid Next.js optimization timeouts
  // IPFS images are already optimized and don't need Next.js processing
  const shouldUnoptimize = unoptimized !== undefined ? unoptimized : isIpfs;

  return (
    <div className="relative">
      {showSkeleton && isLoading && (
        <Skeleton className={className || "w-full h-full absolute inset-0"} />
      )}
      <Image 
        src={imageSrc} 
        onError={handleError} 
        onLoadingComplete={handleLoadingComplete}
        unoptimized={shouldUnoptimize}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className || ''}`}
        {...props} 
      />
    </div>
  );
}

