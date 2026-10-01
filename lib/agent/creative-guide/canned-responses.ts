/**
 * Canned response layer for Creative Guide.
 *
 * Keeps routine onboarding/upload questions cheap and fast by matching them
 * to pre-written answers. Only unmatched or explicitly advanced queries are
 * escalated to the paid Gemini model.
 */

export interface CannedMatch {
  /** If true, the caller should stream a Gemini response instead. */
  escalate: boolean;
  content?: string;
  action?: {
    type: 'reveal_dropzone' | 'explain_steps';
    steps?: string[];
  };
}

const UPLOAD_STEPS = [
  'Connect wallet (already done via Orb/Privy).',
  'Pick a video file to upload.',
  'Add a title, description, and tags.',
  'Optionally attach IP licensing — not required to publish.',
  'Hit Publish. Your clip goes live and is mintable.',
];

/** Stable intent ids used by the decision-model router and substring fallback. */
export type CreativeGuideIntentId =
  | 'upload_howto'
  | 'upload_steps'
  | 'ip_licensing'
  | 'minting'
  | 'about_creative_tv'
  | 'greeting'
  | 'metoken_explain'
  | 'metoken_create'
  | 'metoken_buy'
  | 'membership'
  | 'wallet_help'
  | 'pricing'
  | 'escalate';

/** Common question patterns and their exact canned answers. */
const PATTERNS: {
  intent: CreativeGuideIntentId;
  patterns: string[];
  response: string;
}[] = [
  {
    intent: 'upload_howto',
    patterns: [
      'how do i upload',
      'how to upload',
      'upload my first clip',
      'upload a video',
      'start upload',
      'publish a clip',
      'post a video',
      'how does upload work',
      'upload guide',
    ],
    response:
      'Uploading is easy: pick a video, add title/description/tags, optionally attach IP licensing, then hit Publish. ' +
      'IP licensing is optional — your clip goes live either way.',
  },
  {
    intent: 'upload_steps',
    patterns: [
      'what are the upload steps',
      'upload steps',
      'steps to upload',
      'walk me through upload',
      'explain upload flow',
      'how does uploading work',
    ],
    response: `Here are the steps:\n${UPLOAD_STEPS.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
  },
  {
    intent: 'ip_licensing',
    patterns: [
      'do i need ip licensing',
      'is ip required',
      'do i need ip to upload',
      'is ip licensing mandatory',
      'what is ip licensing',
      'explain ip licensing',
    ],
    response:
      'IP licensing is optional. You can publish clips without it. It helps protect and monetize your work, but it is never required to upload on Creative TV.',
  },
  {
    intent: 'minting',
    patterns: [
      'how do i mint',
      'what is minting',
      'mint my clip',
      'how to mint video',
      'do i need to mint',
    ],
    response:
      'Minting turns your clip into an on-chain digital asset. It is optional after upload. If you want to sell, license, or prove ownership, you can mint from the clip page or during upload.',
  },
  {
    intent: 'about_creative_tv',
    patterns: [
      'what is creative tv',
      'what is crtv',
      'what is creative platform',
      'tell me about creative tv',
      'what is this app',
    ],
    response:
      'Creative TV is the creator video platform on Creative Platform. Upload clips, optionally license your IP, mint on-chain, launch a MeToken, and build your creator economy — all from one place.',
  },
  {
    intent: 'greeting',
    patterns: [
      'who are you',
      'what can you do',
      'help',
      'hello',
      'hi',
      'hey',
    ],
    response:
      "I'm Creative Guide. I can walk you through uploading on Creative TV, explain IP licensing, minting, MeTokens, memberships, and more. Ask me anything or tap 'Start my first upload'.",
  },
  {
    intent: 'metoken_explain',
    patterns: [
      'what is a metoken',
      'what is me token',
      'what are metokens',
      'explain metoken',
      'what is me token',
    ],
    response:
      'A MeToken is a creator personal token fans can buy and hold. It ties your audience to your success — as you grow, supporters can invest in you directly on Creative TV.',
  },
  {
    intent: 'metoken_create',
    patterns: [
      'how do i create a metoken',
      'how to create metoken',
      'create a metoken',
      'set up metoken',
      'setup metoken',
      'launch metoken',
      'start metoken',
    ],
    response:
      'To create your MeToken: go to Profile (/profile) or Portfolio → Create MeToken (/portfolio). Connect your wallet, pick a name and symbol, then deposit collateral (USDC hub). Confirm the transaction and your MeToken is live.',
  },
  {
    intent: 'metoken_buy',
    patterns: [
      'how do i buy metoken',
      'buy metoken',
      'subscribe to creator',
      'how to subscribe',
      'invest in creator',
    ],
    response:
      'Visit a creator profile, find their MeToken section, and use Subscribe or Buy. You will need a connected wallet and USDC for the purchase.',
  },
  {
    intent: 'membership',
    patterns: [
      'what is membership',
      'how do memberships work',
      'join membership',
      'membership benefits',
      'do i need a membership',
    ],
    response:
      'Memberships unlock extra features like gated content, badges, and creator perks. They are optional — you can upload and use Creative TV without one.',
  },
  {
    intent: 'wallet_help',
    patterns: [
      'wallet not working',
      'connect wallet failed',
      'wallet error',
      'privy not working',
      'orb login not working',
      'why is my wallet not connecting',
    ],
    response:
      'Make sure you complete the Orb/Privy sign-in popup. If it is blocked, check your browser for pop-up blockers. Still stuck? Try refreshing the page and signing in again.',
  },
  {
    intent: 'pricing',
    patterns: [
      'how much does it cost',
      'is this free',
      'do i pay',
      'upload cost',
      'chat cost',
      'why do i need to pay',
    ],
    response:
      'Uploading on Creative TV is free. Basic help from Creative Guide is free too. Advanced AI questions that need Gemini cost a small USDC payment per message.',
  },
];

/** Intent → canned answer for decision-model routing. */
export const CANNED_INTENT_RESPONSES: Record<
  Exclude<CreativeGuideIntentId, 'escalate'>,
  string
> = Object.fromEntries(
  PATTERNS.map((p) => [p.intent, p.response])
) as Record<Exclude<CreativeGuideIntentId, 'escalate'>, string>;

/** Criteria descriptions for `/v1/systemone` choice questions. */
export const CREATIVE_GUIDE_INTENT_CRITERIA: Record<
  CreativeGuideIntentId,
  string
> = {
  upload_howto: 'How to upload or publish a video/clip on Creative TV.',
  upload_steps: 'Step-by-step upload flow explanation.',
  ip_licensing: 'Whether IP licensing is required or what it means.',
  minting: 'Minting a clip as an on-chain asset.',
  about_creative_tv: 'What Creative TV / Creative Platform is.',
  greeting: 'Hello, help, who are you, what can you do.',
  metoken_explain: 'What a MeToken is.',
  metoken_create: 'How to create or launch a MeToken.',
  metoken_buy: 'How to buy or subscribe to a MeToken.',
  membership: 'Memberships, passes, and membership benefits.',
  wallet_help: 'Wallet connect / Orb / Privy login problems.',
  pricing: 'Whether Creative TV or Creative Guide is free / costs.',
  escalate:
    'Advanced, novel, or off-topic questions that need the paid Gemini assistant.',
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match a user message against the canned response bank.
 * Returns a canned answer or signals escalation to the paid model.
 */
export function matchCannedResponse(message: string): CannedMatch {
  const normalized = normalize(message);

  for (const item of PATTERNS) {
    for (const pattern of item.patterns) {
      if (normalized.includes(pattern) || pattern.includes(normalized)) {
        return { escalate: false, content: item.response };
      }
    }
  }

  if (/(advanced|detailed|deep|expert|ask the ai|ask gemini)/.test(normalized)) {
    return { escalate: true };
  }

  return { escalate: true };
}

export { UPLOAD_STEPS };
