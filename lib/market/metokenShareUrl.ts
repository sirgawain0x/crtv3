export type MeTokenShareKind = 'creator' | 'content';

export function buildMeTokenSharePath(params: {
  type: MeTokenShareKind;
  /** Creator wallet address for `/creator/<owner>` links (required when type is creator). */
  creatorOwnerAddress?: string;
  playbackId?: string;
}): string {
  if (params.type === 'creator') {
    if (!params.creatorOwnerAddress) {
      return '/market';
    }
    const owner = params.creatorOwnerAddress.toLowerCase();
    return `/creator/${owner}`;
  }

  if (params.type === 'content' && params.playbackId) {
    return `/watch/${params.playbackId}`;
  }

  return '/market';
}

export function buildMeTokenShareUrl(
  origin: string,
  params: Parameters<typeof buildMeTokenSharePath>[0]
): string {
  const normalizedOrigin = origin.replace(/\/$/, '');
  return `${normalizedOrigin}${buildMeTokenSharePath(params)}`;
}
