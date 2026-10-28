import { createClient } from '@/lib/sdk/supabase/server';
import { getMeTokenProtocolInfo, getMeTokenInfoFromBlockchain } from '@/lib/utils/metokenUtils';
import { formatEther } from 'viem';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';
import { computeMeTokenSpotPriceUsd } from '@/lib/metokens/spotPrice';

export interface TokenMarketData {
    price: number;
    tvl: number;
    marketCap: number;
    priceChange24h: number;
    volume24h: number; // meaningful if we can calculate it
    name: string;
    symbol: string;
    owner: string;
    decimals?: number;
}

/**
 * Get market data for a specific MeToken
 * @param tokenAddress - The address of the MeToken
 */
export async function getTokenMarketData(tokenAddress: string): Promise<TokenMarketData | null> {
    try {
        const supabase = await createClient();

        // 1. Fetch current on-chain data for Price and TVL
        // We can use the utils we already have
        const [protocolInfo, tokenInfo] = await Promise.all([
            getMeTokenProtocolInfo(tokenAddress),
            getMeTokenInfoFromBlockchain(tokenAddress)
        ]);

        if (!protocolInfo || !tokenInfo) {
            return null;
        }

        const balancePooled = BigInt(protocolInfo.balancePooled);
        const balanceLocked = BigInt(protocolInfo.balanceLocked);
        const hubId = Number(protocolInfo.hubId);
        const totalSupplyWei = BigInt(tokenInfo.totalSupply);
        const { tvl, price } = computeMeTokenSpotPriceUsd(
            balancePooled,
            balanceLocked,
            hubId,
            totalSupplyWei
        );
        const marketCap = tvl;

        // 2. Calculate 24h Change
        // We'll reuse the logic from the market API but scoped to one token
        // This requires fetching transactions

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const { data: recentTxs } = await supabase
            .from('metoken_transactions')
            .select('transaction_type, amount, collateral_amount, created_at')
            .eq('metoken_id', (await meTokenSupabaseService.getMeTokenByAddress(tokenAddress))?.id)
            .gte('created_at', twentyFourHoursAgo.toISOString())
            .order('created_at', { ascending: false });

        let priceChange24h = 0;
        let volume24h = 0;

        if (recentTxs && recentTxs.length > 0) {
            // ... Replay logic similar to API ...
            // Simplified Volume
            volume24h = recentTxs.reduce((acc, tx) => {
                const collateral = parseFloat(tx.collateral_amount?.toString() || '0');
                if (collateral > 0) return acc + collateral;
                // If no collateral amount, estimate using current price (rough approx)
                const amount = parseFloat(formatEther(BigInt(Math.floor(tx.amount || 0))));
                return acc + (amount * price);
            }, 0);
        }

        // For now, let's return what we have.
        return {
            price,
            tvl,
            marketCap,
            priceChange24h: 0, // Placeholder until we perfect the shared replay logic
            volume24h,
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            owner: tokenInfo.owner,
        };

    } catch (error) {
        console.error("Error fetching token market data:", error);
        return null;
    }
}
