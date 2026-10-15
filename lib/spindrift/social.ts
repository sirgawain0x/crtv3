export const SPINDRIFT_X_HANDLE = "drinkspindrift";
export const CREATIVE_TV_X_HANDLE = "CreativeCrtv";

export const SPINDRIFT_X_URL = `https://x.com/${SPINDRIFT_X_HANDLE}`;
export const CREATIVE_TV_X_URL = `https://x.com/${CREATIVE_TV_X_HANDLE}`;

export const MIXER_CULTURE_HASHTAG = "SpindriftMixerCulture";

export function buildMixerCultureShareText(opts?: {
  title?: string | null;
  pageUrl?: string;
}): string {
  const title = opts?.title?.trim();
  const pageUrl = opts?.pageUrl?.trim();
  const lines = [
    title
      ? `My Grapeade mocktail pour: ${title}`
      : "Check out Spindrift Mixer Culture on Creative TV",
    "Real Fruit / Zero Artificial Shortcuts",
    `@${SPINDRIFT_X_HANDLE} @${CREATIVE_TV_X_HANDLE} #${MIXER_CULTURE_HASHTAG}`,
  ];
  if (pageUrl) lines.push(pageUrl);
  return lines.join("\n\n");
}

export function buildMixerCultureTweetIntentUrl(opts?: {
  title?: string | null;
  pageUrl?: string;
}): string {
  const text = encodeURIComponent(buildMixerCultureShareText(opts));
  return `https://twitter.com/intent/tweet?text=${text}`;
}
