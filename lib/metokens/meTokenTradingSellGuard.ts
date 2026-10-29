import { parseEther } from "viem";

/** Sell submit guard — mirrors buy collateral check in MeTokenTrading. */
export function isMeTokenTradingSellDisabled(
  isLoading: boolean,
  sellAmount: string,
  balance: bigint,
): boolean {
  return (
    isLoading ||
    !sellAmount ||
    parseFloat(sellAmount) <= 0 ||
    balance < parseEther(sellAmount || "0")
  );
}
