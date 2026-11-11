"use server";

import { NextApiRequest, NextApiResponse } from "next";
import {
  FrameWorksUploadsAssetsUnavailableError,
  requireVideoProviderForUploadsAndAssets,
} from "@/lib/video-provider";
import { serverLogger } from "@/lib/utils/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { filename, filetype } = req.body;
      const asset = (await requireVideoProviderForUploadsAndAssets(
        "asset.request-upload",
      ).assets.create({
        name: filename,
      })) as { data?: { tusEndpoint?: string } };

      res.status(200).json({
        uploadUrl: asset.data?.tusEndpoint,
      });
    } catch (error) {
      if (error instanceof FrameWorksUploadsAssetsUnavailableError) {
        res.status(503).json({ error: error.message });
        return;
      }
      serverLogger.error("Error creating Livepeer upload URL:", error);
      res.status(500).json({ error: "Failed to create upload URL" });
    }
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}
