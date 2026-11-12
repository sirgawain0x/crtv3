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
      const { filename, filetype, sizeBytes } = req.body as {
        filename?: string;
        filetype?: string;
        sizeBytes?: number;
      };

      if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        res.status(400).json({ error: "sizeBytes is required and must be a positive number" });
        return;
      }

      const asset = (await requireVideoProviderForUploadsAndAssets(
        "asset.request-upload",
      ).assets.create({
        name: filename,
        filename,
        contentType: filetype,
        sizeBytes,
      })) as { data?: { tusEndpoint?: string; presignedParts?: Array<{ url?: string }> } };

      res.status(200).json({
        uploadUrl: asset.data?.tusEndpoint,
        presignedParts: asset.data?.presignedParts,
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
