"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  const isChunkError =
    error?.name === "ChunkLoadError" ||
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("ChunkLoadError");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">
        {isChunkError ? "Failed to load page" : "Something went wrong"}
      </h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {isChunkError
          ? "A required script failed to load (often due to network or cache). Try again."
          : error?.message}
      </p>
      <button
        type="button"
        onClick={() => (isChunkError ? window.location.reload() : reset())}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {isChunkError ? "Reload page" : "Try again"}
      </button>
    </div>
  );
}
