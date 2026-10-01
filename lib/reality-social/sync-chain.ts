import * as realityQuestion from "@reality.eth/reality-eth-lib/formatters/question.js";
import { formatUnits } from "viem";
import { buildContractTokenMap } from "@/lib/reality-social/contract-map";
import {
  buildCreativeTvQuestionUrl,
  formatDualPosts,
} from "@/lib/reality-social/format-post";
import { postMastodonStatus } from "@/lib/reality-social/publish-mastodon";
import { postTwitterStatus } from "@/lib/reality-social/publish-twitter";
import {
  getRealitySocialConfig,
  hasMastodonCredentials,
  hasTwitterCredentials,
} from "@/lib/reality-social/config";
import { fetchNewAndAnsweredQuestions } from "@/lib/reality-social/subgraph";
import {
  initializeChainSyncState,
  loadChainSyncState,
  saveChainSyncState,
  type ChainSyncState,
} from "@/lib/reality-social/state";
import { serverLogger } from "@/lib/utils/logger";

export type ChainSyncResult = {
  chainId: number;
  processed: number;
  posted: number;
  skipped: number;
  state: ChainSyncState;
  errors: string[];
};

function formatTokenAmount(raw: string, decimals: number, ticker: string): string {
  const formatted = formatUnits(BigInt(raw), decimals).replace(/\.0+$/, "");
  return `${formatted} ${ticker}`;
}

export async function syncRealitySocialForChain(
  chainId: number,
  options?: { init?: boolean },
): Promise<ChainSyncResult> {
  const config = getRealitySocialConfig();
  const { contractTokens, tokenDecimals } = buildContractTokenMap(chainId);

  let state = await loadChainSyncState(chainId);
  if (!state) {
    if (options?.init) {
      state = await initializeChainSyncState(chainId);
    } else {
      throw new Error(
        `No social sync state for chain ${chainId}. Call the cron with ?init=1 once to start from now.`,
      );
    }
  }

  const questions = await fetchNewAndAnsweredQuestions(state.lastTimestamp);
  questions.sort((a, b) => {
    const aTs = Number(a.currentAnswerTimestamp || a.createdTimestamp);
    const bTs = Number(b.currentAnswerTimestamp || b.createdTimestamp);
    return aTs - bTs;
  });

  const result: ChainSyncResult = {
    chainId,
    processed: 0,
    posted: 0,
    skipped: 0,
    state: { ...state },
    errors: [],
  };

  let postsThisRun = 0;

  for (const q of questions) {
    if (postsThisRun >= config.maxPostsPerRun) break;

    result.processed += 1;

    const templateText = q.template?.questionText;
    if (!templateText) {
      result.skipped += 1;
      continue;
    }

    let questionJson: Record<string, unknown>;
    try {
      questionJson = realityQuestion.populatedJSONForTemplate(
        templateText,
        q.data,
        true,
      ) as Record<string, unknown>;
    } catch {
      result.skipped += 1;
      continue;
    }

    if ("errors" in questionJson) {
      result.skipped += 1;
      continue;
    }

    const title = typeof questionJson.title === "string" ? questionJson.title : "";
    if (!title) {
      result.skipped += 1;
      continue;
    }

    const token = contractTokens[q.contract.toLowerCase()];
    const decimals = token ? tokenDecimals[token] : 18;
    const url = buildCreativeTvQuestionUrl(config.siteBaseUrl, q.id);

    let answerText = "";
    let bondText = "";
    let bountyText = "";
    let seenTs = Number(q.createdTimestamp);

    if (q.currentAnswerTimestamp && Number(q.currentAnswerTimestamp) > 0 && q.currentAnswer) {
      answerText = realityQuestion.getAnswerString(questionJson, q.currentAnswer);
      seenTs = Number(q.currentAnswerTimestamp);
      if (q.currentAnswerBond && token) {
        bondText = `(${formatTokenAmount(q.currentAnswerBond, decimals, token)})`;
      }
    } else if (q.bounty && BigInt(q.bounty) > 0n && token) {
      bountyText = `(pays ${formatTokenAmount(q.bounty, decimals, token)})`;
    }

    const { twitter, mastodon } = formatDualPosts({
      title,
      bountyText,
      bondText,
      answerText,
      url,
    });

    try {
      if (config.noop) {
        serverLogger.debug("[reality-social] noop", { chainId, twitter, mastodon });
      } else {
        if (config.twitterEnabled && hasTwitterCredentials()) {
          await postTwitterStatus(twitter);
        }
        if (config.mastodonEnabled && hasMastodonCredentials()) {
          await postMastodonStatus(mastodon);
        }
      }
      postsThisRun += 1;
      result.posted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(message);
      serverLogger.error("[reality-social] post failed", { chainId, message });
      break;
    }

    result.state = {
      lastTimestamp: seenTs,
      lastIndex: 0,
    };
    await saveChainSyncState(chainId, result.state);
  }

  return result;
}
