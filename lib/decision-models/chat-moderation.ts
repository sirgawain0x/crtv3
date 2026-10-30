import { serverLogger } from "@/lib/utils/logger";
import { isDecisionModelConfigured } from "./config";
import { trySystemOne } from "./systemone";
import type { NoulAnswer, ScoreAnswer } from "./types";

export type ChatModerationInput = {
  content: string;
  streamId?: string;
  senderInboxId?: string;
};

export type ChatModerationResult = {
  evaluated: boolean;
  /** Probability message is toxic/abusive (0–1). */
  toxicProbability: number | null;
  /** 0–3 spam rubric. */
  spamScore: number | null;
  /** Soft flag for human moderators; does not ban. */
  flagged: boolean;
  /** When true, persistence should be skipped (high-confidence spam/toxicity). */
  blockPersist: boolean;
  reasons: string[];
};

const SPAM_LEGEND = [
  "Normal conversation",
  "Mildly repetitive or promotional",
  "Likely spam or low-signal flooding",
  "Clear spam / scam / abuse flood",
] as const;

export class ChatModerationBlockedError extends Error {
  constructor(
    message: string,
    readonly result: ChatModerationResult
  ) {
    super(message);
    this.name = "ChatModerationBlockedError";
  }
}

/**
 * Score a live-chat message for toxicity/spam.
 * Human bans/hides remain the authority — this only filters persistence when
 * confidence is high, and never auto-bans wallets.
 */
export async function moderateChatMessage(
  input: ChatModerationInput
): Promise<ChatModerationResult> {
  const content = input.content?.trim() ?? "";
  if (!content || !isDecisionModelConfigured()) {
    return {
      evaluated: false,
      toxicProbability: null,
      spamScore: null,
      flagged: false,
      blockPersist: false,
      reasons: [],
    };
  }

  // Very short messages are not worth a model call.
  if (content.length < 2) {
    return {
      evaluated: false,
      toxicProbability: null,
      spamScore: null,
      flagged: false,
      blockPersist: false,
      reasons: [],
    };
  }

  const result = await trySystemOne(
    {
      streamId: input.streamId ?? null,
      senderInboxId: input.senderInboxId ?? null,
      message: content.slice(0, 2000),
    },
    {
      toxic: {
        type: "noul",
        instructions:
          "Is this live-stream chat message toxic, hateful, harassing, or clearly abusive?",
        criteria: {
          true: "Toxic or abusive content.",
          false: "Acceptable chat content.",
        },
      },
      spam: {
        type: "score",
        instructions: "How spammy or scam-like is this chat message?",
        criteria: [...SPAM_LEGEND],
      },
    },
    { role: "strict" }
  );

  if (!result) {
    return {
      evaluated: false,
      toxicProbability: null,
      spamScore: null,
      flagged: false,
      blockPersist: false,
      reasons: [],
    };
  }

  const toxicAns = result.answers.toxic as NoulAnswer | undefined;
  const spamAns = result.answers.spam as ScoreAnswer | undefined;
  const toxicProbability =
    toxicAns?.type === "noul" ? toxicAns.noul : null;
  const spamScore = spamAns?.type === "score" ? spamAns.score : null;

  const reasons: string[] = [];
  if (toxicProbability !== null && toxicProbability >= 0.7) {
    reasons.push("High toxicity probability");
  }
  if (spamScore !== null && spamScore >= 2) {
    reasons.push("Elevated spam score");
  }

  const flagged =
    (toxicProbability !== null && toxicProbability >= 0.55) ||
    (spamScore !== null && spamScore >= 1.75);

  // Only skip persistence on high-confidence harm — humans still own bans.
  const blockPersist =
    (toxicProbability !== null && toxicProbability >= 0.85) ||
    (spamScore !== null && spamScore >= 2.5);

  const moderation: ChatModerationResult = {
    evaluated: true,
    toxicProbability,
    spamScore,
    flagged,
    blockPersist,
    reasons,
  };

  if (flagged || blockPersist) {
    serverLogger.info("[chat-moderation] flagged message", {
      streamId: input.streamId,
      blockPersist,
      toxicProbability,
      spamScore,
    });
  }

  return moderation;
}
