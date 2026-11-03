import { parseEther } from "viem";

/** Sell submit guard — mirrors buy collateral check in MeTokenTrading. */
export function parseSellAmountWei(sellAmount: string): bigint | null {
  const parsed = parseFloat(sellAmount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  try {
    return parseEther(sellAmount);
  } catch {
    return null;
  }
}

export function isMeTokenTradingSellDisabled(
  isLoading: boolean,
  sellAmount: string,
  balance: bigint,
): boolean {
  if (isLoading || !sellAmount) {
    return true;
  }
  const amountWei = parseSellAmountWei(sellAmount);
  if (amountWei === null) {
    return true;
  }
  return balance < amountWei;
}
