"use server";
import {
  isLivepeerAiTextToImageEnabled,
  livepeerAiTextToImageDisabledResult,
  type LivepeerAiDisabledResult,
} from "@/lib/livepeer/livepeer-ai-gating";
import { fullLivepeer } from "@/lib/sdk/livepeer/fullClient";
import { TextToImageParams } from "livepeer/models/components";
import { serverLogger } from "@/lib/utils/logger";

export const getLivepeerAiGeneratedImages = async (
  params: TextToImageParams,
): Promise<unknown | LivepeerAiDisabledResult> => {
  if (!isLivepeerAiTextToImageEnabled()) {
    return livepeerAiTextToImageDisabledResult();
  }

  const result = await fullLivepeer.generate.textToImage(params);

  serverLogger.debug("Text to image result:", result);

  return result.imageResponse;
};
