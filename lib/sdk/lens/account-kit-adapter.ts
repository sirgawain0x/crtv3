import { WalletClient } from "viem";

/**
 * AccountKit uses Smart Accounts (EIP-1271).
 * When Lens asks for a signature, we need to sign the typed data (EIP-712).
 * 
 * This adapter helps massage the data if needed, but standard viem wallet clients
 * usually handle `signTypedData` correctly for 7702/Smart Accounts.
 */
export async function signLensChallenge(
    walletClient: WalletClient,
    account: string,
    message: string
) {
    // Lens challenge is a simple string but often wrapped in EIP-712 for login
    // For the initial challenge-response, it's often a personal_sign or just a signMessage
    return walletClient.signMessage({
        account: account as `0x${string}`,
        message,
    });
}

export async function signLensTypedData(
    walletClient: WalletClient,
    account: string,
    domain: any,
    types: any,
    value: any
) {
    // Omit EIP712Domain from types if present, as viem handles it via the 'domain' arg
    const { EIP712Domain, ...validTypes } = types;

    return walletClient.signTypedData({
        account: account as `0x${string}`,
        domain,
        types: validTypes,
        primaryType: Object.keys(validTypes)[0], // Usually 'Post', 'Comment', etc.
        message: value,
    });
}
