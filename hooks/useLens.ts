"use client";

import { useState, useCallback, useEffect } from "react";
import { useSmartAccountClient, useUser } from "@account-kit/react";
import { signLensChallenge } from "@/lib/sdk/lens/account-kit-adapter";
import { publicClient } from "@/lib/sdk/lens/client";
import { textOnly, video, MediaVideoMimeType, MetadataLicenseType } from "@lens-protocol/metadata";
import { groveService } from "@/lib/sdk/grove/service";
import { post } from "@lens-protocol/client/actions";
import { uri, SessionClient } from "@lens-protocol/client";
import { WalletClient } from "viem";
import { toast } from "sonner";

export interface CreatePostParams {
    content: string;
    mediaUrl: string;
    title?: string;
    coverUrl?: string;
    mimeType?: MediaVideoMimeType;
}

export interface UseLensReturn {
    isLoggedIn: boolean;
    isPosting: boolean;
    login: () => Promise<void>;
    createPost: (params: CreatePostParams) => Promise<string | undefined>;
}

export function useLens(): UseLensReturn {
    const [sessionClient, setSessionClient] = useState<SessionClient | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const { client } = useSmartAccountClient({
        accountParams: { mode: "7702" },
    });
    const user = useUser();
    const accountAddress = user?.address;

    // TODO: Ideally we persist the session in local storage or use the SDK's storage provider
    // for auto-resume. For now, we'll keep it in state.

    const login = useCallback(async () => {
        if (!client || !accountAddress) {
            toast.error("Please connect your wallet first.");
            return;
        }

        try {
            // 1. Request Challenge
            // Using `onboardingUser` for wallet-based login.
            const challengeResult = await publicClient.challenge({
                onboardingUser: {
                    wallet: accountAddress,
                },
            });

            if (challengeResult.isErr()) {
                throw new Error(challengeResult.error.message);
            }

            const { id, text } = challengeResult.value;

            // 2. Sign Challenge
            const signature = await signLensChallenge(
                client as unknown as WalletClient,
                accountAddress,
                text
            );

            // 3. Authenticate
            const authResult = await publicClient.authenticate({
                id,
                signature,
            });

            if (authResult.isErr()) {
                throw new Error(authResult.error.message);
            }

            const session = authResult.value;
            setSessionClient(session);
            toast.success("Signed in to Lens!");

        } catch (err: any) {
            console.error("Lens Login Error:", err);
            toast.error(`Login failed: ${err.message}`);
        }
    }, [client, accountAddress]);

    const createPost = useCallback(async ({
        content,
        mediaUrl,
        title = "Creative TV Video",
        coverUrl,
        mimeType = MediaVideoMimeType.MP4
    }: CreatePostParams) => {
        if (!sessionClient) {
            await login();
            // We can't immediately retry because login sets state asynchronously 
            // and we won't have the sessionClient in this closure instantly.
            return;
        }

        setIsPosting(true);
        try {
            // 1. Create Video Metadata
            const metadata = video({
                title: title,
                content: content,
                video: {
                    item: mediaUrl,
                    type: mimeType,
                    cover: coverUrl, // Optional cover image
                    license: MetadataLicenseType.CCO, // Defaulting to CC0 for now
                },
                locale: "en",
            });

            // 2. Upload to Grove (IPFS)
            const uploadResult = await groveService.uploadJson(metadata);

            if (!uploadResult.success || !uploadResult.url) {
                throw new Error("Failed to upload post metadata to Grove");
            }

            // 3. Create Post
            const result = await post(sessionClient, {
                contentUri: uri(uploadResult.url),
            });

            if (result.isErr()) {
                throw new Error(result.error.message);
            }

            const value = result.value;

            console.log("Post result:", value);
            toast.success("Post submitted to Lens!");

            return "posted";

        } catch (err: any) {
            console.error("Lens Post Error:", err);
            toast.error(`Posting failed: ${err.message}`);
        } finally {
            setIsPosting(false);
        }
    }, [sessionClient, login]);

    return {
        isLoggedIn: !!sessionClient,
        isPosting,
        login,
        createPost,
    };
}
