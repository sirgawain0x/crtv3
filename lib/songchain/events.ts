export type SongchainEventStatus = "active" | "upcoming";

export type SongchainEvent = {
  slug: string;
  title: string;
  description?: string;
  status: SongchainEventStatus;
  href?: string;
};

export const SONGCHAIN_EVENTS: SongchainEvent[] = [
  {
    slug: "song-cup",
    title: "Song Cup Contest",
    description: "Predict your winner. Guess your song. Runs through the World Cup.",
    status: "active",
    href: "/songchain/song-cup",
  },
  {
    slug: "season-2",
    title: "Songchain Season 2",
    description: "Begins when Song Cup ends.",
    status: "upcoming",
  },
];

export const SONG_CUP_PLAY_LINKS = {
  goal: "https://orb.club/c/worldcup",
  beat: "https://beatme.creativeplatform.xyz",
} as const;
