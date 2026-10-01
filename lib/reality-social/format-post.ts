export type PostParts = {
  title: string;
  bountyText: string;
  bondText: string;
  answerText: string;
  url: string;
  category?: string;
};

export type FormattedPosts = {
  twitter: string;
  mastodon: string;
};

const TWITTER_MAX_BODY = 180;
const MASTODON_MAX_BODY = 400;

const MASTODON_HASHTAGS = "#OpenData #Decentralized #Predictions";

function trimComposite(
  title: string,
  bountyText: string,
  bondText: string,
  answerText: string,
  maxBody: number,
): string {
  let str = title;
  if (bountyText) str += ` ${bountyText}`;
  if (answerText) str += ` ${answerText}`;
  if (bondText) str += ` ${bondText}`;

  if (str.length <= maxBody) return str;

  let answer = answerText;
  if (answer.length > 20) {
    answer = `${answer.slice(0, 20)}...`;
  }

  let endPart = answer;
  if (bondText) endPart = `${endPart} ${bondText}`.trim();
  if (bountyText) endPart = `${bountyText} ${endPart}`.trim();

  const charsRemain = maxBody - endPart.length;
  let trimmedTitle = title;
  if (trimmedTitle.length > charsRemain) {
    trimmedTitle = `${trimmedTitle.slice(0, Math.max(0, charsRemain - 3))}...`;
  }

  if (!endPart) return trimmedTitle;
  return `${trimmedTitle} ${endPart}`.trim();
}

/** Formats X and Mastodon statuses (upstream @reality.eth/*-bot logic + Creative TV link). */
export function formatDualPosts(parts: PostParts): FormattedPosts {
  const twitterBody = trimComposite(
    parts.title,
    parts.bountyText,
    parts.bondText,
    parts.answerText,
    TWITTER_MAX_BODY,
  );
  const mastodonBody = trimComposite(
    parts.title,
    parts.bountyText,
    parts.bondText,
    parts.answerText,
    MASTODON_MAX_BODY,
  );

  const twitter = `${twitterBody} ${parts.url}`.trim();
  const mastodon = `${mastodonBody} ${parts.url} ${MASTODON_HASHTAGS}`.trim();

  return { twitter, mastodon };
}

export function buildCreativeTvQuestionUrl(siteBaseUrl: string, questionId: string): string {
  const base = siteBaseUrl.replace(/\/$/, "");
  return `${base}/predict/${questionId}`;
}
