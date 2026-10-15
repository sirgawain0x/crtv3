export type SpindriftEventStatus = "active" | "upcoming";

type SpindriftEventBase = {
  slug: string;
  title: string;
  description?: string;
};

export type SpindriftEvent =
  | (SpindriftEventBase & { status: "active"; href: string })
  | (SpindriftEventBase & { status: "upcoming" });

export const SPINDRIFT_EVENTS: SpindriftEvent[] = [
  {
    slug: "mixer-culture",
    title: "Mixer Culture",
    description: "Grapeade mocktail pours — real fruit, zero shortcuts",
    status: "active",
    href: "/spindrift/mixer-culture",
  },
];
