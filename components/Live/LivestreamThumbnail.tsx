"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface LivestreamThumbnailProps {
  thumbnailUrl: string;
  priority?: boolean;
}

export function LivestreamThumbnail({ thumbnailUrl, priority = false }: LivestreamThumbnailProps) {
  const [refreshValue, setRefreshValue] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setRefreshValue(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  if (!thumbnailUrl) return null;

  return (
    <Image
      src={`${thumbnailUrl}?refresh=${refreshValue}`}
      alt="Live stream thumbnail"
      className="w-full h-auto rounded-md"
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      width={320}
      height={180}
    />
  );
}
