/** App-side circuit breakers. Alchemy policy limits must also be enforced at the provider. */
export function isGasSponsorshipEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED === "true";
}

export function isUsdcGasPaymentEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED === "true";
}

/** Handles both legacy paymasterService and Wallet API paymaster capabilities. */
export function limitGasCapabilities(
  capabilities?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!capabilities) return undefined;
  const result = { ...capabilities };
  const paymaster = result.paymaster as { erc20?: unknown } | undefined;
  const userPays = Boolean(result.erc20 || paymaster?.erc20);
  const allowed = userPays ? isUsdcGasPaymentEnabled() : isGasSponsorshipEnabled();
  if (!allowed) {
    delete result.paymaster;
    delete result.paymasterService;
    delete result.erc20;
  }
  return Object.keys(result).length ? result : undefined;
}
