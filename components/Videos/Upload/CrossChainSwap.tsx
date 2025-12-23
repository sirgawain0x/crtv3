"use client";

import React, { useState } from "react";
import {
    useSmartAccountClient,
    usePrepareSwap,
    useSignAndSendPreparedCalls,
    useWaitForCallsStatus,
    useUser,
} from "@account-kit/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowRightLeft, CheckCircle, Wallet } from "lucide-react";
import { toHex, parseUnits, formatUnits } from "viem";
import { USDC_TOKEN_ADDRESSES, USDC_TOKEN_DECIMALS } from "@/lib/contracts/USDCToken";

/**
 * Supported Chain IDs
 */
const CHAIN_IDS = {
    BASE: 8453, // 0x2105
    STORY_TESTNET: 1315, // 0x523
    STORY_MAINNET: 1514, // 0x5EA
} as const;

/**
 * Token Addresses
 * NATIVE: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEee (ETH or IP token)
 * USDC on Base: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
 * USDC on Story Mainnet: 0xF1815bd50389c46847f0Bda824eC8da914045D14
 * Note: Story testnet USDC address TBD - using mainnet for now
 */
const TOKENS = {
    NATIVE: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEee",
    USDC_BASE: USDC_TOKEN_ADDRESSES.base,
    USDC_STORY_MAINNET: "0xF1815bd50389c46847f0Bda824eC8da914045D14",
    // TODO: Add Story testnet USDC address when available
    USDC_STORY_TESTNET: "0xF1815bd50389c46847f0Bda824eC8da914045D14", // Using mainnet address as placeholder
} as const;

interface CrossChainSwapProps {
    onSwapSuccess?: () => void;
    requiredAmount?: string; // Optional amount hint
}

export function CrossChainSwap({ onSwapSuccess, requiredAmount }: CrossChainSwapProps) {
    const user = useUser();
    const { client } = useSmartAccountClient({});
    const [error, setError] = useState<string | null>(null);
    const [quote, setQuote] = useState<any>(null); // TODO: Type properly from SDK if available

    // Get current Story Network from env or default to testnet
    const isMainnet = process.env.NEXT_PUBLIC_STORY_NETWORK === "mainnet";
    const targetChainId = isMainnet
        ? CHAIN_IDS.STORY_MAINNET
        : CHAIN_IDS.STORY_TESTNET;
    
    // Get USDC address for target Story network
    const storyUsdcAddress = isMainnet
        ? TOKENS.USDC_STORY_MAINNET
        : TOKENS.USDC_STORY_TESTNET;

    // 1. Prepare Swap Hook
    const { prepareSwapAsync, isPreparingSwap } = usePrepareSwap({
        client,
    });

    // 2. Sign and Send Hook
    const {
        signAndSendPreparedCallsAsync,
        isSigningAndSendingPreparedCalls,
        signAndSendPreparedCallsResult,
    } = useSignAndSendPreparedCalls({ client });

    // 3. Wait for Status Hook
    const {
        data: statusResult,
        isLoading: isWaitingForConfirmation,
        error: waitError,
    } = useWaitForCallsStatus({
        client,
        id: signAndSendPreparedCallsResult?.preparedCallIds[0],
    });

    const handleRequestQuote = async () => {
        if (!client?.account.address) return;
        setError(null);
        setQuote(null);

        try {
            // Use requiredAmount if provided, otherwise default to 1 USDC
            // USDC has 6 decimals, so 1 USDC = 1000000 units
            const defaultAmount = "1"; // 1 USDC
            const amountStr = requiredAmount || defaultAmount;
            const val = parseUnits(amountStr, USDC_TOKEN_DECIMALS);
            const amountToSwap = toHex(val);

            // Get paymaster policy ID from env (if configured)
            const paymasterPolicyId = process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID;

            const result = await prepareSwapAsync({
                from: client.account.address,
                fromToken: TOKENS.USDC_BASE, // USDC on Base
                toChainId: toHex(targetChainId),
                toToken: storyUsdcAddress, // USDC on Story
                fromAmount: amountToSwap,
                // Include paymaster capabilities if policy ID is configured
                // This allows gas sponsorship or paying gas with ERC-20 tokens (like USDC)
                ...(paymasterPolicyId && {
                    capabilities: {
                        paymasterService: {
                            policyId: paymasterPolicyId,
                        },
                    },
                }),
            });

            const { quote: swapQuote, ...calls } = result;
            setQuote({ quote: swapQuote, calls });

        } catch (err) {
            console.error("Swap quote error:", err);
            setError(err instanceof Error ? err.message : "Failed to get swap quote");
        }
    };

    const handleExecuteSwap = async () => {
        if (!quote || !quote.calls) return;

        try {
            await signAndSendPreparedCallsAsync(quote.calls);
        } catch (err) {
            console.error("Swap execution error:", err);
            setError(err instanceof Error ? err.message : "Failed to execute swap");
        }
    };

    // Status Helpers
    const isSwapSuccessful = statusResult?.statusCode === 200;
    // 120 = Cross-Chain In Progress
    const isCrossChainPending = statusResult?.statusCode === 120 || (isWaitingForConfirmation && !isSwapSuccessful);

    React.useEffect(() => {
        if (isSwapSuccessful && onSwapSuccess) {
            onSwapSuccess();
        }
    }, [isSwapSuccessful, onSwapSuccess]);

    if (!user) {
        return <div className="text-sm text-center p-4">Please connect wallet to swap.</div>;
    }

    return (
        <Card className="w-full bg-slate-50 border-blue-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    Fund Story Wallet
                </CardTitle>
                <CardDescription>
                    Swap USDC from Base to USDC on Story Protocol.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {waitError && (
                    <Alert variant="destructive">
                        <AlertTitle>Transaction Error</AlertTitle>
                        <AlertDescription>{waitError instanceof Error ? waitError.message : "Unknown error"}</AlertDescription>
                    </Alert>
                )}

                {!quote && !signAndSendPreparedCallsResult && (
                    <Button
                        onClick={handleRequestQuote}
                        disabled={isPreparingSwap}
                        className="w-full"
                        variant="secondary"
                    >
                        {isPreparingSwap ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Getting Quote...
                            </>
                        ) : (
                            <>
                                Get Quote (1 USDC)
                            </>
                        )}
                    </Button>
                )}

                {quote && !signAndSendPreparedCallsResult && (
                    <div className="space-y-3">
                        <div className="bg-white p-3 rounded-md border text-sm">
                            <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">Pay (Base):</span>
                                <span className="font-medium">
                                    {requiredAmount ? `${requiredAmount} USDC` : "1 USDC"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Receive (Story):</span>
                                {/* Display estimated receive amount if available in quote */}
                                <span className="font-medium">
                                    {quote.quote.minimumToAmount ? `~${formatUnits(BigInt(quote.quote.minimumToAmount), USDC_TOKEN_DECIMALS)} USDC` : "Calculated at execution"}
                                </span>
                            </div>
                        </div>

                        <Button
                            onClick={handleExecuteSwap}
                            disabled={isSigningAndSendingPreparedCalls}
                            className="w-full"
                        >
                            {isSigningAndSendingPreparedCalls ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Swapping...
                                </>
                            ) : (
                                <>
                                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                                    Confirm Swap
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {signAndSendPreparedCallsResult && (
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-4 text-center">
                        {isSwapSuccessful ? (
                            <div className="flex flex-col items-center gap-2 text-green-600">
                                <CheckCircle className="h-8 w-8" />
                                <p className="font-semibold">Swap Complete!</p>
                                <p className="text-sm text-muted-foreground">Your Balance has been funded.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-blue-700">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <p className="font-semibold">
                                    {isCrossChainPending ? "Cross-Chain Swap in Progress..." : "Processing..."}
                                </p>
                                <p className="text-xs text-blue-600/80">
                                    This may take a few minutes. You can close this or wait for confirmation.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
