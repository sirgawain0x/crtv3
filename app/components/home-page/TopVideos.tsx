import * as React from 'react';

import { Card, CardContent } from '@app/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@app/components/ui/carousel';

export function TopVideos() {
  return (
    <div className="mx-auto w-full max-w-6xl py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-3xl font-bold">Trending Videos</h1>
      </div>
      <Carousel className="min-w-sm mx-auto w-full max-w-lg">
        <CarouselContent className="-ml-1">
          {Array.from({ length: 10 }).map((_, index) => (
            <CarouselItem
              key={index}
              className="pl-1 md:basis-1/2 lg:basis-1/2"
            >
              <div className="p-1">
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    <span className="text-2xl font-semibold">{index + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
