import "dotenv/config";
import { type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import {
  createSmartWalletClient,
  alchemyWalletTransport,
} from "@alchemy/wallet-apis";
import { serverLogger } from "@/lib/utils/logger";
import { appendBuilderCode } from "@/lib/utils/builder-code";
import { getAlchemyApiKey } from "@/lib/web3/alchemy-key";
import { resolveServerGas } from "@/lib/wallet/gas-policy";
import { buildErc20PaymasterConfig } from "@/lib/wallet/usdc-gas";
import { buildSwapQuoteRequest } from "./swap-quote";
import { buildSwapSendCapabilities, submitSwapCalls, type SwapSendCallsArgs } from "./swap-send";

export const config = {
  /**
   * @deprecated Gas for swaps is resolved per call by `resolveServerGas()` so
   * the sponsorship switch is honoured. Kept for callers reading the raw value.
   */
  get policyId(): string | undefined {
    return resolveServerGas().paymaster?.policyId;
  },
};

function getClientParams() {
  const apiKey = getAlchemyApiKey();
  const privateKey = process.env.ALCHEMY_SWAP_PRIVATE_KEY;

  if (!apiKey) {
    throw new Error("ALCHEMY_API_KEY is not configured");
  }

  if (!privateKey) {
    throw new Error("ALCHEMY_SWAP_PRIVATE_KEY is not configured");
  }

  // The platform wallet signs these swaps, so the platform pays the gas.
  // Sponsor only when sponsorship is explicitly enabled; otherwise no paymaster
  // (the wallet pays ETH itself).
  //
  // Note: this client-level `paymaster` option only ever carries policy ids —
  // createSmartWalletClient's type is `{ policyId?, policyIds? }` and drops an
  // `erc20` block, so the USDC settings would be silently lost. The real
  // capability is passed on each sendCalls (see swap-send.ts). Keeping this for
  // the sponsored case is harmless because the per-send capability takes
  // priority, but do not rely on it for ERC-20.
  const gas = resolveServerGas({ erc20Config: buildErc20PaymasterConfig() });

  return {
    transport: alchemyWalletTransport({ apiKey }),
    chain: base,
    signer: privateKeyToAccount(privateKey as Hex),
    ...(gas.paymaster ? { paymaster: gas.paymaster } : {}),
  };
}

type SwapWalletClient = {
  sendCalls: (args: SwapSendCallsArgs) => Promise<{ id: string }>;
  waitForCallsStatus: (args: { id: string }) => Promise<{
    status?: string;
    receipts?: Array<{ transactionHash?: string }>;
  }>;
  requestAccount: (args: {
    creationHint: { accountType: "sma-b" };
  }) => Promise<{ address: Address }>;
};

let account: { address: Address } | null = null;
let client: SwapWalletClient | null = null;

export async function initializeSwapClient() {
  if (process.env.ALCHEMY_SERVER_SWAPS_ENABLED !== "true") {
    throw new Error("Server wallet swaps are disabled");
  }
  if (client && account) return client;

  try {
    const clientParams = getClientParams();
    const clientWithoutAccount = createSmartWalletClient(clientParams as never);
    account = await clientWithoutAccount.requestAccount({
      creationHint: { accountType: "sma-b" },
    });

    client = createSmartWalletClient({
      ...clientParams,
      account: account.address,
    } as never) as SwapWalletClient;

    serverLogger.debug("Swap client initialized with account:", account.address);
    return client;
  } catch (error) {
    serverLogger.error("Failed to initialize swap client:", error);
    throw error;
  }
}

export async function getSwapClient() {
  if (!client) {
    await initializeSwapClient();
  }
  return client!;
}

export async function getSwapAccountAddress(): Promise<Address> {
  if (!account) {
    await initializeSwapClient();
  }
  return account!.address;
}

export async function executeSwap(params: {
  fromToken: string;
  toToken: string;
  fromAmount: Hex;
  minimumToAmount?: Hex;
}) {
  if (process.env.ALCHEMY_SERVER_SWAPS_ENABLED !== "true") {
    throw new Error("Server wallet swaps are disabled");
  }
  serverLogger.debug("Starting swap execution with params:", params);

  const apiKey = getAlchemyApiKey();
  const privateKey = process.env.ALCHEMY_SWAP_PRIVATE_KEY;
  const gas = resolveServerGas({ erc20Config: buildErc20PaymasterConfig() });

  if (!apiKey || !privateKey) {
    throw new Error("Swap environment variables are not fully configured");
  }

  const swapClient = await getSwapClient();
  const accountAddress = await getSwapAccountAddress();

  const quoteRequest = buildSwapQuoteRequest(params, gas, accountAddress);

  const response = await fetch(`https://api.g.alchemy.com/v2/${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip",
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      ...quoteRequest,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Quote request failed: ${response.status} - ${errorText}`);
  }

  const quoteResponse = (await response.json()) as Record<string, unknown> | null;
  if (!quoteResponse || typeof quoteResponse !== "object") {
    throw new Error("Invalid JSON response from Alchemy quote API");
  }
  const rpcError = quoteResponse.error as { message?: string } | undefined;
  if (rpcError) {
    throw new Error(`RPC Error: ${rpcError.message ?? "Unknown error"}`);
  }
  if (!quoteResponse.result) {
    throw new Error("No quote result received from Alchemy");
  }

  const quote = quoteResponse.result;
  const calls = (quote as { calls?: Array<{ to: string; data: string; value: string }> }).calls;

  // The ERC-20 paymaster settings must travel with every send. Passing them at
  // client construction is not enough: the SDK keeps only policy ids, so an
  // ERC-20 policy would arrive without tokenAddress/maxTokenAmount.
  const sendCapabilities = buildSwapSendCapabilities(gas);

  let txHash: Hex;

  if (calls && Array.isArray(calls) && calls.length > 0) {
    txHash = await submitSwapCalls(
      swapClient,
      accountAddress,
      calls.map((call) => ({
        to: call.to as Address,
        data: call.data as Hex,
        value: BigInt(call.value || "0"),
      })),
      sendCapabilities,
    );
  } else {
    const quoteData = (quote as { data?: { target?: string; sender?: string; callData?: string; value?: string } }).data;
    if (!quoteData) {
      throw new Error("Invalid quote format: missing data or calls");
    }

    const target = (quoteData.target || quoteData.sender || accountAddress) as Address;
    const callData = quoteData.callData as Hex;

    txHash = await submitSwapCalls(
      swapClient,
      accountAddress,
      [{ to: target, data: callData, value: BigInt(quoteData.value || "0") }],
      sendCapabilities,
    );
  }

  return {
    transactionHash: txHash,
    success: true,
    message: "Swap executed successfully.",
  };
}
