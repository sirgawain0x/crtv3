export function isMeTokenTradingDisabled(params: {
  isLoading: boolean;
  isMembershipLoading: boolean;
  tradeInFlight: boolean;
}): boolean {
  return (
    params.isLoading ||
    params.isMembershipLoading ||
    params.tradeInFlight
  );
}
