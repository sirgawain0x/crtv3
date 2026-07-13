// Creative TV only uses the EVM path from @alchemy/wallet-apis.
// The package imports its Solana decorator and helpers unconditionally,
// which pulls @solana/kit into the Next.js bundle and can fail when other
// dependencies install a different @solana/errors major.
// This stub keeps the EVM client path buildable by providing no-op
// replacements for every Solana-named export.
export const solanaSmartWalletActions = () => ({});
export const createSolanaSmartWalletClient = () => ({});
export const resolveSignerSlot = () => null;
export const signSignatureRequest = () => ({});
export const signPreparedCalls = () => ({});
export default { solanaSmartWalletActions };