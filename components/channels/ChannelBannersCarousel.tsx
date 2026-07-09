"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { SongCupBanner } from "@/components/songchain/SongCupBanner";
import { HackBetaBanner } from "@/components/chones/hack-beta/HackBetaBanner";
import { cn } from "@/lib/utils";

type ChannelBannersCarouselProps = {
  className?: string;
};

export function ChannelBannersCarousel({ className }: ChannelBannersCarouselProps) {
  return (
    <Carousel
      opts={{ loop: true, align: "start" }}
      className={cn("w-full", className)}
    >
      <CarouselContent className="-ml-0">
        <CarouselItem className="pl-0">
          <SongCupBanner />
        </CarouselItem>
        <CarouselItem className="pl-0">
          <HackBetaBanner />
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious className="left-2 sm:left-4" />
      <CarouselNext className="right-2 sm:right-4" />
    </Carousel>
  );
}
