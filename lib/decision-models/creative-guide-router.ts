import {
  CANNED_INTENT_RESPONSES,
  CREATIVE_GUIDE_INTENT_CRITERIA,
  matchCannedResponse,
  type CannedMatch,
  type CreativeGuideIntentId,
} from "@/lib/agent/creative-guide/canned-responses";
import { serverLogger } from "@/lib/utils/logger";
import { trySystemOne } from "./systemone";
import type { ChoiceAnswer } from "./types";

const INTENT_IDS = Object.keys(
  CREATIVE_GUIDE_INTENT_CRITERIA
) as CreativeGuideIntentId[];

function isIntentId(value: string): value is CreativeGuideIntentId {
  return (INTENT_IDS as string[]).includes(value);
}

/**
 * Route a Creative Guide user message via TypeSafe Jev (when configured),
 * falling back to substring canned matching. Never replaces Gemini for
 * escalated answers.
 */
export async function routeCreativeGuideMessage(
  message: string
): Promise<CannedMatch & { intent?: CreativeGuideIntentId; source: "decision" | "substring" }> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { escalate: true, source: "substring" };
  }

  const result = await trySystemOne(
    { user_message: trimmed },
    {
      intent: {
        type: "choice",
        instructions:
          "Which Creative Guide FAQ intent best matches this user message? " +
          "Use escalate when none of the FAQ intents clearly fit or the user asks for advanced/deep help.",
        criteria: Object.fromEntries(
          INTENT_IDS.map((id) => [id, CREATIVE_GUIDE_INTENT_CRITERIA[id]])
        ),
      },
    },
    { role: "routing" }
  );

  if (result) {
    const answer = result.answers.intent as ChoiceAnswer | undefined;
    const choice = answer?.type === "choice" ? answer.choice : undefined;
    if (choice && isIntentId(choice)) {
      if (choice === "escalate") {
        serverLogger.debug("[CreativeGuide] decision model → escalate");
        return { escalate: true, intent: "escalate", source: "decision" };
      }
      const content = CANNED_INTENT_RESPONSES[choice];
      if (content) {
        serverLogger.debug("[CreativeGuide] decision model →", choice);
        return {
          escalate: false,
          content,
          intent: choice,
          source: "decision",
        };
      }
    }
  }

  const fallback = matchCannedResponse(trimmed);
  return { ...fallback, source: "substring" };
}
