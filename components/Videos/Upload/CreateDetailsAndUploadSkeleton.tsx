import { Skeleton } from "@/components/ui/skeleton";

export function CreateDetailsAndUploadSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Details Form Skeleton */}
        <div className="flex-1 lg:max-w-xl">
          <div className="space-y-6">
            <div>
              <Skeleton className="h-7 w-32 mb-6" /> {/* Video Details heading */}
              <div className="space-y-4">
                {/* Title field */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-12" /> {/* Label */}
                  <Skeleton className="h-10 w-full" /> {/* Input */}
                </div>

                {/* Description field */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" /> {/* Label */}
                  <Skeleton className="h-32 w-full" /> {/* Textarea */}
                </div>

                {/* Location and Genre grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" /> {/* Label */}
                    <Skeleton className="h-10 w-full" /> {/* Input */}
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-12" /> {/* Label */}
                    <Skeleton className="h-10 w-full" /> {/* Select */}
                  </div>
                </div>

                {/* Ticker field */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" /> {/* Label */}
                  <Skeleton className="h-10 w-full" /> {/* Input */}
                </div>

                {/* Revenue Splits section */}
                <div className="pt-2">
                  <Skeleton className="h-5 w-40" /> {/* Collapsible trigger */}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Upload Skeleton */}
        <div className="flex-1">
          <Skeleton className="h-7 w-32 mb-6" /> {/* Video File heading */}
          <div className="bg-card border rounded-lg p-4 space-y-6">
            {/* File input skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" /> {/* Label */}
              <Skeleton className="h-10 w-full" /> {/* File input */}
              <div className="space-y-1">
                <Skeleton className="h-3 w-64" /> {/* Format info */}
                <Skeleton className="h-3 w-56" /> {/* Codec info */}
              </div>
            </div>

            {/* Video player skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-5 w-24 mx-auto" /> {/* Selected file label */}
              <Skeleton className="aspect-video w-full rounded-lg" /> {/* Video player area */}
            </div>

            {/* Upload button skeleton */}
            <div className="flex justify-center">
              <Skeleton className="h-10 w-32" /> {/* Upload button */}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom button skeleton */}
      <div className="mt-8 flex justify-end">
        <Skeleton className="h-11 w-40" /> {/* Create & Continue button */}
      </div>
    </div>
  );
}

