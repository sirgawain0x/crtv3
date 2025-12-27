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
import { toHex, parseUnits, formatUnits, formatEther, parseEther, type Address } from "viem";

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
 * NATIVE: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEee (ETH on Base or IP token on Story)
 */
const TOKENS = {
    NATIVE: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEee", // ETH on Base, IP token on Story
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
    const [ethBalance, setEthBalance] = useState<string | null>(null);
    const [isCheckingBalance, setIsCheckingBalance] = useState(false);

    // Get current Story Network from env or default to testnet
    const isMainnet = process.env.NEXT_PUBLIC_STORY_NETWORK === "mainnet";
    const targetChainId = isMainnet
        ? CHAIN_IDS.STORY_MAINNET
        : CHAIN_IDS.STORY_TESTNET;
    
    // Always swap to native IP token on Story Protocol
    // This is needed for gas fees and transactions on Story Protocol
    const storyTokenAddress = TOKENS.NATIVE; // Native IP token on Story Protocol

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

    // Fetch ETH balance
    const fetchEthBalance = React.useCallback(async () => {
        if (!client?.account.address) {
            setEthBalance(null);
            return;
        }

        try {
            const balance = await client.getBalance({
                address: client.account.address as Address,
            });

            setEthBalance(formatEther(balance));
        } catch (err) {
            console.error("Error fetching ETH balance:", err);
            setEthBalance(null);
        }
    }, [client]);

    // Fetch balance on mount and when address changes
    React.useEffect(() => {
        fetchEthBalance();
    }, [fetchEthBalance]);

    const handleRequestQuote = async () => {
        if (!client?.account.address) return;
        setError(null);
        setQuote(null);
        setIsCheckingBalance(true);

        // Declare balanceFormatted at function scope so it's accessible in catch block
        let balanceFormatted: string | null = null;

        try {
            // First, check ETH balance
            const balance = await client.getBalance({
                address: client.account.address as Address,
            });

            balanceFormatted = formatEther(balance);
            setEthBalance(balanceFormatted);

            // Use requiredAmount if provided, otherwise default to 0.001 ETH
            // ETH has 18 decimals
            const defaultAmount = "0.001"; // 0.001 ETH
            const amountStr = requiredAmount || defaultAmount;
            const amountToSwapBigInt = parseEther(amountStr);

            // Check if balance is sufficient
            if (balance < amountToSwapBigInt) {
                const errorMsg = `Insufficient ETH balance. You have ${balanceFormatted} ETH, but need ${amountStr} ETH for this swap.`;
                setError(errorMsg);
                setIsCheckingBalance(false);
                return;
            }

            const amountToSwap = toHex(amountToSwapBigInt);

            // Get paymaster policy ID from env (if configured)
            const paymasterPolicyId = process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID;

            // Check if a custom recipient address is configured for Story Protocol funding wallet
            // This allows sending IP tokens directly to the wallet that funds Story Protocol transactions
            // IMPORTANT: Cross-chain swaps typically send tokens to the same address on the destination chain
            // (i.e., your smart account address on Story Protocol). If you need tokens in a different wallet,
            // you may need to transfer them after the swap completes, or use a different bridging method.
            const storyFundingWallet = process.env.NEXT_PUBLIC_STORY_FUNDING_WALLET_ADDRESS;
            const recipientAddress = storyFundingWallet || client.account.address;

            const swapParams: any = {
                from: client.account.address,
                fromToken: TOKENS.NATIVE, // ETH on Base (native token)
                toChainId: toHex(targetChainId),
                toToken: storyTokenAddress, // Native IP token on Story Protocol
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
            };

            // If a custom recipient is specified and different from sender, try to add it
            // Note: Alchemy's cross-chain swap API may not support custom recipients
            // Tokens will likely still be sent to the smart account address on Story Protocol
            // If you need tokens in a different wallet, use the transfer feature after the swap
            if (storyFundingWallet && recipientAddress.toLowerCase() !== client.account.address.toLowerCase()) {
                console.log("🎯 Attempting to use custom recipient address for Story Protocol funding wallet:", recipientAddress);
                console.log("⚠️ Note: Cross-chain swaps may not support custom recipients. Tokens may still go to your smart account address.");
                // Some swap APIs support a 'to' parameter for the destination address
                // This is API-dependent and may not be supported by Alchemy's swap API
                swapParams.to = recipientAddress;
            }

            const result = await prepareSwapAsync(swapParams);

            const { quote: swapQuote, ...calls } = result;
            
            // Debug: Log the raw quote to understand the format and verify the amount
            console.log("🔍 Full swap quote response:", {
                quote: swapQuote,
                fullResult: result,
            });
            
            if (swapQuote.minimumToAmount) {
                const rawAmount = BigInt(swapQuote.minimumToAmount);
                const formattedAmount = formatEther(rawAmount);
                const ipAmount = parseFloat(formattedAmount);
                
                console.log("📊 Quote Analysis:", {
                    fromAmount: amountStr + " ETH",
                    minimumToAmountRaw: swapQuote.minimumToAmount,
                    minimumToAmountType: typeof swapQuote.minimumToAmount,
                    minimumToAmountBigInt: rawAmount.toString(),
                    formattedIP: formattedAmount,
                    ipAmountNumeric: ipAmount,
                    expectedIP: `~${(parseFloat(amountStr) * 500).toFixed(2)} IP (based on CoinGecko: 0.5 IP ≈ $0.725, ETH ≈ $3000)`,
                    isZero: rawAmount === 0n,
                    isVerySmall: ipAmount < 0.000001,
                });
                
                // Warn if the quote seems unreasonably low
                if (ipAmount < 0.01) {
                    const expectedAmount = parseFloat(amountStr) * 500; // Conservative estimate
                    console.warn(`⚠️ Quote seems very low! Expected ~${expectedAmount.toFixed(2)} IP for ${amountStr} ETH, got:`, formattedAmount);
                    console.warn("⚠️ This likely means the swap route ETH (Base) → IP (Story) is not available or has no liquidity.");
                    console.warn("⚠️ You may need to use a different route or bridge to get IP tokens.");
                }
                
                // If the amount is actually zero, this route doesn't exist
                if (rawAmount === 0n) {
                    console.error("❌ Quote returned ZERO - This swap route does not exist!");
                    console.error("❌ The cross-chain route USDC (Base) → IP (Story) is not available.");
                    console.error("❌ Consider: 1) Using a different bridge, 2) Swapping to ETH first, 3) Using Story mainnet if on testnet");
                }
            } else {
                console.error("❌ No minimumToAmount in quote response:", swapQuote);
            }
            
            setQuote({ quote: swapQuote, calls });

        } catch (err) {
            console.error("Swap quote error:", err);
            let errorMessage = "Failed to get swap quote";
            
            if (err instanceof Error) {
                // Check for common error messages
                if (err.message.includes("transfer amount exceeds balance") || 
                    err.message.includes("ERC20: transfer amount exceeds balance") ||
                    err.message.includes("insufficient funds")) {
                    // Use balanceFormatted if available (from current fetch), otherwise fall back to state
                    const currentBalance = balanceFormatted || ethBalance || "0";
                    const defaultAmount = requiredAmount || "0.001";
                    errorMessage = `Insufficient ETH balance. You have ${currentBalance} ETH, but need ${defaultAmount} ETH for this swap. Please ensure your smart wallet has enough ETH on Base network.`;
                } else if (err.message.includes("status 500") || err.message.includes("500")) {
                    // Handle API 500 errors - often means route not available or invalid token address
                    if (!isMainnet) {
                        errorMessage = `Cross-chain swap to Story Testnet may not be available. The swap API returned an error. This could be because:
                        
1. The swap route may not be available for Story Testnet
2. Try switching to Story Mainnet (set NEXT_PUBLIC_STORY_NETWORK=mainnet) or contact support.`;
                    } else {
                        errorMessage = `Swap API error. The cross-chain swap route may not be available or there may be a temporary issue. Please try again later or contact support.`;
                    }
                } else {
                    errorMessage = err.message;
                }
            }
            
            setError(errorMessage);
        } finally {
            setIsCheckingBalance(false);
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
        if (isSwapSuccessful) {
            // Refresh balance after successful swap
            fetchEthBalance();
            if (onSwapSuccess) {
                onSwapSuccess();
            }
        }
    }, [isSwapSuccessful, onSwapSuccess, fetchEthBalance]);

    if (!user) {
        return <div className="text-sm text-center p-4">Please connect wallet to swap.</div>;
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    Fund Story Wallet
                </CardTitle>
                <CardDescription>
                    Swap ETH from Base to $IP on Story Protocol{!isMainnet ? " (Testnet - may not be available)" : ""}.
                    <span className="block mt-1 text-xs text-muted-foreground">
                        IP tokens will be sent to your smart account. After the swap, transfer them to the funding wallet to pay for Story Protocol transactions.
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Display ETH Balance */}
                {ethBalance !== null && (
                    <div className="bg-muted/50 border rounded-md p-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Your ETH Balance (Base):</span>
                            <span className="font-semibold text-foreground">{ethBalance} ETH</span>
                        </div>
                    </div>
                )}
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
                        disabled={isPreparingSwap || isCheckingBalance}
                        className="w-full"
                        variant="secondary"
                    >
                        {isPreparingSwap || isCheckingBalance ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isCheckingBalance ? "Checking Balance..." : "Getting Quote..."}
                            </>
                        ) : (
                            <>
                                Get Quote (0.001 ETH)
                            </>
                        )}
                    </Button>
                )}

                {quote && !signAndSendPreparedCallsResult && (
                    <div className="space-y-3">
                        <div className="bg-card border p-3 rounded-md text-sm">
                            <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">Pay (Base):</span>
                                <span className="font-medium text-foreground">
                                    {requiredAmount ? `${requiredAmount} ETH` : "0.001 ETH"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Receive (Story):</span>
                                {/* Display estimated receive amount if available in quote */}
                                {/* IP token uses 18 decimals (like ETH), so use formatEther */}
                                <span className="font-medium text-foreground">
                                    {quote.quote.minimumToAmount ? (() => {
                                        try {
                                            // Handle both string and hex formats
                                            const amount = typeof quote.quote.minimumToAmount === 'string' 
                                                ? quote.quote.minimumToAmount.startsWith('0x')
                                                    ? BigInt(quote.quote.minimumToAmount)
                                                    : BigInt(quote.quote.minimumToAmount)
                                                : BigInt(quote.quote.minimumToAmount);
                                            const formatted = formatEther(amount);
                                            // Format to show reasonable precision (up to 6 decimal places)
                                            const numFormatted = parseFloat(formatted);
                                            
                                            // Warn if quote seems unreasonably low (expected ~0.69 IP for 1 USDC)
                                            // Use same default as swap amount (0.001 ETH)
                                            const swapAmount = parseFloat(requiredAmount || "0.001");
                                            const expectedMin = swapAmount * 0.5; // Conservative estimate
                                            if (numFormatted < expectedMin) {
                                                console.warn(`⚠️ Quote seems low: ${numFormatted.toFixed(6)} IP for ${swapAmount} USDC. Expected at least ~${expectedMin.toFixed(2)} IP based on market rates.`);
                                            }
                                            
                                            return `~${numFormatted.toFixed(6)} IP`;
                                        } catch (e) {
                                            console.error("Error formatting IP amount:", e, quote.quote.minimumToAmount);
                                            return "Error formatting amount";
                                        }
                                    })() : "Calculated at execution"}
                                </span>
                            </div>
                        </div>
                        
                        {/* Warning if quote seems unreasonably low or zero */}
                        {quote.quote.minimumToAmount && (() => {
                            try {
                                const amount = typeof quote.quote.minimumToAmount === 'string' 
                                    ? quote.quote.minimumToAmount.startsWith('0x')
                                        ? BigInt(quote.quote.minimumToAmount)
                                        : BigInt(quote.quote.minimumToAmount)
                                    : BigInt(quote.quote.minimumToAmount);
                                const ipAmount = parseFloat(formatEther(amount));
                                // Use same default as swap amount (0.001 ETH)
                                const swapAmount = parseFloat(requiredAmount || "0.001");
                                const expectedMin = swapAmount * 0.5; // Based on CoinGecko: 0.5 IP = $0.725, so 1 USDC should get ~0.69 IP
                                
                                // If quote is zero, the route doesn't exist
                                if (amount === 0n) {
                                    return (
                                        <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                                            <AlertTitle className="text-red-800 dark:text-red-200">Route Not Available</AlertTitle>
                                            <AlertDescription className="text-xs text-red-800 dark:text-red-200">
                                                ❌ The cross-chain swap route ETH (Base) → IP (Story) is not available. 
                                                The quote returned zero, which means this route doesn't exist or has no liquidity.
                                                <br /><br />
                                                <strong>Possible solutions:</strong>
                                                <br />• Try using Story Mainnet instead of Testnet
                                                <br />• Use a different bridge or swap service
                                                <br />• Check if IP tokens are available through a faucet (for testnet)
                                                <br />• Contact Story Protocol support for bridge options
                                            </AlertDescription>
                                        </Alert>
                                    );
                                }
                                
                                // If quote is very low, warn about poor rates
                                if (ipAmount < expectedMin && ipAmount > 0) {
                                    return (
                                        <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                                            <AlertTitle className="text-yellow-800 dark:text-yellow-200">Low Quote Warning</AlertTitle>
                                            <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
                                                ⚠️ This quote seems unusually low. Based on market rates (0.5 IP ≈ $0.725), 
                                                you should receive approximately {expectedMin.toFixed(2)} IP for {swapAmount} ETH, 
                                                but the quote shows {ipAmount.toFixed(6)} IP.
                                                <br /><br />
                                                The swap route may have very low liquidity. Check the browser console for detailed quote information.
                                            </AlertDescription>
                                        </Alert>
                                    );
                                }
                            } catch (e) {
                                console.error("Error checking quote amount:", e);
                                return null;
                            }
                            return null;
                        })()}

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
                    <div className="bg-muted/50 border rounded-md p-4 text-center">
                        {isSwapSuccessful ? (
                            <div className="flex flex-col items-center gap-2 text-green-600 dark:text-green-400">
                                <CheckCircle className="h-8 w-8" />
                                <p className="font-semibold">Swap Complete!</p>
                                <p className="text-sm text-muted-foreground">Your Balance has been funded.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-primary">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <p className="font-semibold">
                                    {isCrossChainPending ? "Cross-Chain Swap in Progress..." : "Processing..."}
                                </p>
                                <p className="text-xs text-muted-foreground">
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
