import React, { Suspense } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from "lucide-react";
import { PredictionList } from "@/components/predictions/PredictionList";
import { PredictionListSkeleton } from "@/components/predictions/PredictionListSkeleton";

export default function PredictPage() {
  return (
    <div className="min-h-screen px-2 sm:px-6 py-6">
      <div className="my-5 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <span role="img" aria-label="home">
                  🏠
                </span>{" "}
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink>
                <BreadcrumbPage>Predict</BreadcrumbPage>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div>
        <h1 className="text-lg sm:text-xl font-bold">Predictions</h1>
      </div>
      <div className="mt-5">
        <p className="text-base sm:text-lg">
          Make predictions and bet on outcomes using Reality.eth.
        </p>
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-4 w-full max-w-full">
          <Suspense fallback={<PredictionListSkeleton />}>
            <PredictionList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
