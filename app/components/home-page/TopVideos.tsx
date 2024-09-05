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
    <div className="mx-auto w-full max-w-7xl py-8">
      {' '}
      {/* Increase max-width to make the carousel wider */}
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-3xl font-bold">TRENDING VIDEOS</h1>
      </div>
      <div className="relative mx-auto w-full max-w-7xl">
        <Carousel className="min-w-sm mx-auto w-full max-w-7xl">
          {' '}
          {/* Adjust max-width here as well */}
          <CarouselContent className="-ml-1">
            {Array.from({ length: 10 }).map((_, index) => (
              <CarouselItem
                key={index}
                className="basis-full pl-0 sm:basis-1/2 sm:pl-1 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
              >
                <div className="h-64 p-1">
                  {' '}
                  {/* Adjust height here */}
                  <Card className="h-full w-full">
                    <CardContent className="flex aspect-square h-full w-full items-center justify-center p-6">
                      {' '}
                      {/* Adjust height here */}
                      <span className="text-2xl font-semibold">
                        {index + 1}
                      </span>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 transform" />
          <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 transform" />
        </Carousel>
      </div>
    </div>
  );
}
