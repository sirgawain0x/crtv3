export type SongCupPanel =
  | "feed"
  | "songcup"
  | "pixels"
  | "submit"
  | "vote"
  | "predict"
  | "leaderboard";

export type SidebarIconId = SongCupPanel | "beatme" | "worldcup";

export type SidebarIcon = {
  id: SidebarIconId;
  src: string;
  alt: string;
  dividerAfter?: boolean;
  externalHref?: string;
};

export const SONG_CUP_BUTTON_ICONS: SidebarIcon[] = [
  {
    id: "songcup",
    src: "/songchain/button-icons/songcup-icon.svg",
    alt: "Song cup",
  },
  {
    id: "pixels",
    src: "/songchain/button-icons/Pixels-icon.svg",
    alt: "Create with pixels",
  },
  {
    id: "submit",
    src: "/songchain/button-icons/submit-icon.svg",
    alt: "Submit",
    dividerAfter: true,
  },
  {
    id: "vote",
    src: "/songchain/button-icons/vote-icon.svg",
    alt: "Vote now",
  },
  {
    id: "predict",
    src: "/songchain/button-icons/predict-icon.svg",
    alt: "Predict",
  },
  {
    id: "leaderboard",
    src: "/songchain/button-icons/leaderboard-icon.svg",
    alt: "Leaderboard",
  },
  {
    id: "feed",
    src: "/songchain/button-icons/feed-icon.svg",
    alt: "The Feed",
    dividerAfter: true,
  },
  {
    id: "beatme",
    src: "/songchain/button-icons/beat-me-icon.svg",
    alt: "Beat me",
    externalHref: "https://beatme.creativeplatform.xyz",
  },
  {
    id: "worldcup",
    src: "/songchain/button-icons/worldcup-icon.svg",
    alt: "World cup",
    externalHref: "https://orb.club/c/worldcup",
  },
];
