"use server";

import { NextApiRequest, NextApiResponse } from "next";
import {
  FrameworksGraphqlUnionError,
  FrameWorksUploadsAssetsUnavailableError,
  requireVideoProviderForUploadsAndAssets,
} from "@/lib/video-provider";
import { serverLogger } from "@/lib/utils/logger";
import {
  walletAuthHeadersToArgs,
  WalletAuthError,
} from "@/lib/auth/require-wallet";
import {
  maybeMintUploadSessionTicket,
  requireUploadCreatorWallet,
} from "@/lib/video-provider/upload-session-auth";

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

      const auth = walletAuthHeadersToArgs(req.headers as Record<string, string>);
      const creator = await requireUploadCreatorWallet(auth);

      const asset = (await requireVideoProviderForUploadsAndAssets(
        "asset.request-upload",
      ).assets.create({
        name: filename,
        filename,
        contentType: filetype,
        sizeBytes,
        creatorId: { type: "unverified", value: creator },
      })) as {
        data?: {
          tusEndpoint?: string;
          uploadId?: string;
          partSize?: number;
          presignedParts?: Array<{ url?: string }>;
        };
      };

      const uploadId = asset.data?.uploadId;
      const uploadTicket = uploadId
        ? maybeMintUploadSessionTicket(uploadId, creator)
        : undefined;

      res.status(200).json({
        uploadUrl: asset.data?.tusEndpoint,
        uploadId,
        partSize: asset.data?.partSize,
        presignedParts: asset.data?.presignedParts,
        uploadTicket,
      });
    } catch (error) {
      if (error instanceof WalletAuthError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      if (error instanceof FrameWorksUploadsAssetsUnavailableError) {
        res.status(503).json({ error: error.message });
        return;
      }
      if (error instanceof FrameworksGraphqlUnionError) {
        const status =
          error.graphqlTypename === "AuthError"
            ? 401
            : error.graphqlTypename === "NotFoundError"
              ? 404
              : error.graphqlTypename === "ValidationError"
                ? 400
                : 502;
        res.status(status).json({ error: error.message });
        return;
      }
      serverLogger.error("Error creating Livepeer upload URL:", error);
      res.status(500).json({ error: "Failed to create upload URL" });
    }
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}