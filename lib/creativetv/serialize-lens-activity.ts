import type { AnyPost } from "@lens-protocol/graphql";
import { postText, resolvePostContent } from "@/lib/songchain/post-utils";
import type { CreativeTVLensActivityItem } from "@/lib/creativetv/lens-activity-types";

function authorLabel(post: AnyPost): string {
  const author = post.author;
  if (author.username?.localName) return `@${author.username.localName}`;
  return `${author.address.slice(0, 6)}…${author.address.slice(-4)}`;
}

function buildOrbUrl(post: AnyPost): string {
  const author = post.author;
  const handle = author.username?.localName ?? author.address;
  return `https://orb.club/p/${encodeURIComponent(handle)}/${encodeURIComponent(post.id)}`;
}

export function serializeLensActivityPost(post: AnyPost): CreativeTVLensActivityItem | null {
  const content = resolvePostContent(post);
  if (!content) return null;

  const text = postText(content).trim();
  const createdAt =
    "timestamp" in content && typeof content.timestamp === "string"
      ? content.timestamp
      : null;

  return {
    id: content.id,
    text,
    authorLabel: authorLabel(content),
    authorHandle: content.author.username?.localName ?? null,
    createdAt,
    orbUrl: buildOrbUrl(content),
  };
}

export function serializeLensActivityPosts(
  posts: readonly AnyPost[],
): CreativeTVLensActivityItem[] {
  const items: CreativeTVLensActivityItem[] = [];
  for (const post of posts) {
    const item = serializeLensActivityPost(post);
    if (item) items.push(item);
  }
  return items;
}
