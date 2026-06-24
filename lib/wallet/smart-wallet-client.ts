import {
  createSmartWalletClient,
  alchemyWalletTransport,
} from "@alchemy/wallet-apis";
import type { LocalAccount } from "viem/accounts";
import type { Address, Chain, Hash, Hex } from "viem";
import { http, type Transport } from "viem";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "";
const PAYMASTER_POLICY_ID =
  process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID?.replace(/^["']|["']$/g, "") ?? "";

export type UserOperationCall = {
  target: Address;
  data?: Hex;
  value?: bigint;
};

export type SendUserOperationArgs = {
  uo: UserOperationCall | UserOperationCall[];
  context?: {
    paymasterService?: { policyId: string };
    erc20?: { tokenAddress: string };
    permissions?: { context?: Hex };
  };
  overrides?: Record<string, unknown>;
};

/** Runtime wallet client with compat helpers (loose typing avoids TS stack overflows). */
export type CompatSmartAccountClient = {
  account: { address: Address };
  scaAddress: Address;
  chain?: Chain;
  getAddress: () => Address;
  sendUserOperation: (
    args: SendUserOperationArgs,
  ) => Promise<{ hash: string; request: { sender: Address } }>;
  waitForUserOperationTransaction: (args: {
    hash: string;
  }) => Promise<Hash>;
  sendCalls: (args: Record<string, unknown>) => Promise<{ id: string }>;
  waitForCallsStatus: (args: { id: string }) => Promise<{
    status?: string;
    receipts?: Array<{ transactionHash?: string }>;
  }>;
  requestAccount: (args: {
    creationHint: { accountType: "sma-b" };
  }) => Promise<{ address: Address }>;
  signPreparedCalls: (calls: unknown) => Promise<unknown>;
  sendPreparedCalls: (calls: unknown) => Promise<{ preparedCallIds: string[] }>;
  extend: <T>(fn: (client: unknown) => T) => T;
  readContract: (args: Record<string, unknown>) => Promise<unknown>;
  getBalance: (args: { address: Address }) => Promise<bigint>;
  getCode: (args: { address: Address }) => Promise<Hex>;
  waitForTransactionReceipt: (args: { hash: Hash }) => Promise<unknown>;
  transport: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function chainUsesAlchemyTransport(chain: Chain): boolean {
  return chain.id === 8453;
}

function getTransportForChain(chain: Chain): Transport | ReturnType<typeof alchemyWalletTransport> {
  if (chainUsesAlchemyTransport(chain)) {
    return alchemyWalletTransport({ apiKey: ALCHEMY_API_KEY });
  }
  const rpc = chain.rpcUrls.default.http[0];
  if (!rpc) {
    throw new Error(`No RPC URL configured for chain ${chain.id}`);
  }
  return http(rpc);
}

const scaAddressCache = new Map<string, Address>();

function cacheKey(signerAddress: Address, chainId: number) {
  return `${chainId}:${signerAddress.toLowerCase()}`;
}

export async function resolveScaAddress(
  client: Pick<CompatSmartAccountClient, "requestAccount">,
  signerAddress: Address,
  chainId: number,
): Promise<Address> {
  const key = cacheKey(signerAddress, chainId);
  const cached = scaAddressCache.get(key);
  if (cached) return cached;

  const { address } = await client.requestAccount({
    creationHint: { accountType: "sma-b" },
  });
  scaAddressCache.set(key, address);
  return address;
}

function mapPaymasterCapabilities(
  context?: SendUserOperationArgs["context"],
): { paymaster?: { policyId: string } } | undefined {
  const policyId = context?.paymasterService?.policyId ?? PAYMASTER_POLICY_ID;
  if (!policyId) return undefined;
  return { paymaster: { policyId } };
}

type WalletClientParams = {
  signer: LocalAccount;
  transport: Transport | ReturnType<typeof alchemyWalletTransport>;
  chain: Chain;
  account?: Address;
  paymaster?: { policyId: string };
};

function createWalletClient(params: WalletClientParams): CompatSmartAccountClient {
  return createSmartWalletClient(params as never) as unknown as CompatSmartAccountClient;
}

export async function createCompatSmartAccountClient(
  signer: LocalAccount,
  chain: Chain,
): Promise<CompatSmartAccountClient> {
  const transport = getTransportForChain(chain);
  const paymaster = PAYMASTER_POLICY_ID ? { policyId: PAYMASTER_POLICY_ID } : undefined;

  const baseClient = createWalletClient({ signer, transport, chain, paymaster });
  const scaAddress = await resolveScaAddress(baseClient, signer.address, chain.id);

  const clientWithAccount = createWalletClient({
    signer,
    transport,
    chain,
    account: scaAddress,
    paymaster,
  });

  const compat = Object.assign(clientWithAccount, {
    account: { address: scaAddress },
    scaAddress,
    chain,
    getAddress: () => scaAddress,
    async sendUserOperation(args: SendUserOperationArgs) {
      const uoArray = Array.isArray(args.uo) ? args.uo : args.uo ? [args.uo] : [];
      if (uoArray.length === 0) {
        throw new Error("User operation calls (uo) cannot be empty");
      }
      const calls = uoArray.map((uo) => ({
        to: uo.target,
        data: (uo.data ?? "0x") as Hex,
        value: uo.value ?? 0n,
      }));

      const paymasterCaps = mapPaymasterCapabilities(args.context);
      const permissionsContext = args.context?.permissions?.context;
      const capabilities =
        paymasterCaps || permissionsContext
          ? {
              ...(paymasterCaps ?? {}),
              ...(permissionsContext
                ? { permissions: { context: permissionsContext } }
                : {}),
            }
          : undefined;

      const result = await clientWithAccount.sendCalls({
        account: scaAddress,
        calls,
        ...(capabilities ? { capabilities } : {}),
        ...(args.overrides ?? {}),
      });

      return {
        hash: result.id,
        request: { sender: scaAddress },
      };
    },
    async waitForUserOperationTransaction({ hash }: { hash: string }) {
      const status = await clientWithAccount.waitForCallsStatus({ id: hash });
      if (status.status === "reverted") {
        throw new Error("Transaction reverted");
      }
      const txHash = status.receipts?.[0]?.transactionHash;
      if (!txHash) {
        throw new Error("Transaction hash not available from call status");
      }
      return txHash as Hash;
    },
  }) as CompatSmartAccountClient;

  return compat;
}
