import { useState } from 'react';
import { useSmartAccountClient } from '@account-kit/react';
import { encodeFunctionData, parseEther } from 'viem';
import { useToast } from '@/components/ui/use-toast';

const ERC20_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "recipient", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "transfer",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

export function useMeTokenPurchase() {
    const { client } = useSmartAccountClient({});
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    const purchaseVideo = async (
        videoId: number,
        price: string,
        meTokenAddress: string,
        creatorAddress: string
    ) => {
        if (!client) {
            toast({
                title: "Error",
                description: "Wallet not connected",
                variant: "destructive",
            });
            return;
        }

        setIsPending(true);
        try {
            const amountWei = parseEther(price);

            // 1. Send Transfer Transaction (Pay the creator)
            // In a real app, this might go to a platform contract that handles splits, 
            // but for now we transfer directly to owner as per requirements.
            const data = encodeFunctionData({
                abi: ERC20_ABI,
                functionName: 'transfer',
                args: [creatorAddress as `0x${string}`, amountWei],
            });

            const uo = await client.sendUserOperation({
                uo: {
                    target: meTokenAddress as `0x${string}`,
                    data: data,
                    value: BigInt(0),
                },
            });

            setIsPending(false);
            setIsConfirming(true);

            const txHash = await client.waitForUserOperationTransaction({
                hash: uo.hash,
            });

            // 2. Register Purchase in DB
            const response = await fetch('/api/purchases/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId,
                    transactionHash: txHash,
                    amount: price,
                    currency: meTokenAddress
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to register purchase');
            }

            setIsConfirming(false);
            toast({
                title: "Success!",
                description: "Video unlocked.",
            });

            return txHash;
        } catch (error) {
            console.error("Purchase failed:", error);
            setIsPending(false);
            setIsConfirming(false);
            toast({
                title: "Purchase Failed",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
            });
            throw error;
        }
    };

    return {
        purchaseVideo,
        isPending,
        isConfirming,
    };
}
