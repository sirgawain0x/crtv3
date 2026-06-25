import { getAddress, isAddress, type Address } from 'viem';
import { parseBundlerError } from '@/lib/utils/bundlerErrorParser';

export function normalizeRecipientAddress(input: string): Address | null {
  const trimmed = input.trim();
  if (!isAddress(trimmed)) return null;
  return getAddress(trimmed);
}

export function formatSendError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Failed to initiate transaction.';
  }
  const parsed = parseBundlerError(error);
  return `${parsed.message}. ${parsed.suggestion}`;
}

export function getMaxEthSendAmount(balance: string, buffer = 0.001): string {
  const available = parseFloat(balance);
  if (available <= 0) return '0';
  if (buffer <= 0) return available.toFixed(6);
  const max = available - buffer;
  return max > 0 ? max.toFixed(6) : '0';
}
