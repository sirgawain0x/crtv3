"use server";
import { getVideoProvider } from "@/lib/video-provider";
import { TextToImageParams } from "livepeer/models/components";
import { serverLogger } from "@/lib/utils/logger";

export const getLivepeerAiGeneratedImages = async (
  params: TextToImageParams
) => {
  if (!getVideoProvider().ai.isEnabled()) {
    throw new Error("Video AI is disabled for the active video provider");
  }
  const result = (await getVideoProvider().ai.textToImage(params)) as {
    imageResponse: unknown;
  };

  serverLogger.debug("Text to image result:", result);

  return result.imageResponse;
};
