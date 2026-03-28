"use server";
import { fullLivepeer } from "@/lib/sdk/livepeer/fullClient";
import { TextToImageParams } from "livepeer/models/components";
import { serverLogger } from "@/lib/utils/logger";

export const getLivepeerAiGeneratedImages = async (
  params: TextToImageParams
) => {
  const result = await fullLivepeer.generate.textToImage(params);

  serverLogger.debug("Text to image result:", result);

  return result.imageResponse;
};
