/**
 * Locked Lens primitives for the Creative TV app channel (Phase A: read-only feed).
 * @see https://lens.xyz/docs/llms.txt
 */
export const CREATIVE_TV_LENS_APP_ID =
  "0x3412C2509EeF4f9A133E6D3638B9B3c06fc30111" as const;

/** Creative Member Social Graph */
export const CREATIVE_TV_LENS_GRAPH_ID =
  "0x2B36706E8E352a273c34D108A5854A55cb2302A6" as const;

/** Default feed (open rules) */
export const CREATIVE_TV_LENS_PUBLIC_FEED_ID =
  "0x3c336f772167d789d8f781a7002c33451120D74D" as const;

export const CREATIVE_TV_LENS_NAMESPACE_ID =
  "0x1E643F889D6eD970bADBD231C34F2C7C7105987A" as const;

export const CREATIVE_TV_LENS_TREASURY_ID =
  "0xf46F1BA19A9280F752a451d0973b047D81c63D70" as const;

/** Linked Group creator-members (graph follow rules are open; reference only). */
export const CREATIVE_TV_LENS_LINKED_GROUP_CREATOR_MEMBERS_ID =
  "0x9955f161fe87e4BB0CDdD7A1ba3D32E588942fA1" as const;

export const CREATIVE_TV_LENS = {
  appId: CREATIVE_TV_LENS_APP_ID,
  graphId: CREATIVE_TV_LENS_GRAPH_ID,
  publicFeedId: CREATIVE_TV_LENS_PUBLIC_FEED_ID,
  namespaceId: CREATIVE_TV_LENS_NAMESPACE_ID,
  treasuryId: CREATIVE_TV_LENS_TREASURY_ID,
  linkedGroupCreatorMembersId: CREATIVE_TV_LENS_LINKED_GROUP_CREATOR_MEMBERS_ID,
} as const;
