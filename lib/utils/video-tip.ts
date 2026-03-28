import type { VideoChatMessage } from "@/lib/hooks/xmtp/useVideoChat";

/**
 * Parse a message content to detect if it's a tip message
 */
export function parseTipMessage(content: string): VideoChatMessage['tipData'] | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.type === 'tip' && parsed.amount && parsed.token && parsed.txHash) {
      return {
        amount: parsed.amount,
        token: parsed.token,
        txHash: parsed.txHash,
      };
    }
  } catch {
    // Not JSON, treat as regular text
  }
  return null;
}

/**
 * Get block explorer URL for transaction
 */
export function getExplorerUrl(txHash: string): string {
  return `https://basescan.org/tx/${txHash}`;
}

