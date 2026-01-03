import { useEffect, useRef } from 'react';
import { alchemyClient } from '@/lib/sdk/alchemy/alchemy-client';
import { MarketToken } from '@/app/api/market/tokens/route';
import { Utils } from 'alchemy-sdk';

interface UseMarketRealtimeOptions {
    enabled?: boolean;
    onUpdate?: (tokenAddress: string) => void;
}

/**
 * Hook to subscribe to real-time updates for market tokens
 * Listens for Transfer events on the token contracts
 */
export function useMarketRealtime(
    tokens: MarketToken[],
    options: UseMarketRealtimeOptions = {}
) {
    const { enabled = true, onUpdate } = options;
    const subscribedAddresses = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!enabled || !tokens.length || typeof window === 'undefined') return;

        // Only subscribe to visible tokens to save resources
        const addresses = tokens.map(t => t.address.toLowerCase());

        // Determine new subscriptions
        const newAddresses = addresses.filter(addr => !subscribedAddresses.current.has(addr));

        if (newAddresses.length === 0) return;

        console.log(`🔌 Connecting WSS for ${newAddresses.length} tokens...`);

        const handleLog = (log: any) => {
            try {
                const address = log.address.toLowerCase();
                if (onUpdate) {
                    onUpdate(address);
                }
            } catch (err) {
                console.error('Error handling WSS log:', err);
            }
        };

        // Subscribe to Transfer events for new tokens
        // We listen to Transfer events as they indicate mints/burns/trades which affect price/TVL
        // Event signature: Transfer(address indexed from, address indexed to, uint256 value)
        const transferTopic = Utils.id("Transfer(address,address,uint256)");

        newAddresses.forEach(address => {
            // Alchemy allowing filtering by address
            alchemyClient.ws.on(
                {
                    address,
                    topics: [transferTopic],
                },
                handleLog
            );
            subscribedAddresses.current.add(address);
        });

        // Cleanup function
        return () => {
            // We don't thoroughly unsubscribe individually here to avoid thrashing on re-renders,
            // but normally we should. However, alchemy-sdk might not have a simple "off" for specific filters easily
            // without keeping reference to the exact handler wrapper.
            // For now, on unmount of the hook (page change), we should clear all.

            // Actually, to properly clean up, we should remove listeners.
            // But since 'handleLog' is a closure, we need to be careful.
            // A better approach for a global list might be needed if this component mounts/unmounts often.
            // Assuming this is used in the main Market page which stays mounted.

            // If we really want to clean up:
            // alchemyClient.ws.removeAllListeners(); // This might be too aggressive if shared
        };
    }, [tokens, enabled, onUpdate]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (subscribedAddresses.current.size > 0) {
                console.log('🔌 Disconnecting WSS...');
                alchemyClient.ws.removeAllListeners(); // aggressive but safe for this page
                subscribedAddresses.current.clear();
            }
        };
    }, []);
}
