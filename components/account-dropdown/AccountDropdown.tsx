"use client";

/**
 * AccountDropdown Component
 *
 * This component serves as the primary user account interface for the application,
 * handling wallet connections, network switching integrations.
 *
 * KEY ARCHITECTURE NOTES:
 * 1. INTEGRATION POINTS:
 *    - Account Kit: For wallet connection and chain management
 *
 *
 * 2. STATE MANAGEMENT:
 *    - EOA Signer: Required for Account Kit authentication (ECDSA signatures)
 *    - Unified Session Signer: Manages session authentication with Account Kit
 *    - Chain state: Handles network switching between supported chains
 *
 * 3. IMPORTANT WORKFLOWS:
 *    - Authentication: EOA signer must be initialized before Account Kit auth
 *    - Session Signatures: By Account Kit
 *    - Chain Switching: Changes the network for Account Kit integration
 */

import { useState, useEffect } from "react";
import {
  useAuthModal,
  useLogout,
  useUser,
  useChain,
  useSmartAccountClient,
  useSendUserOperation,
} from "@account-kit/react";
import { base, optimism } from "@account-kit/infra";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Copy,
  LogOut,
  Wallet,
  Send,
  ArrowUpRight,
  ArrowUpDown,
  ArrowBigDown,
  ArrowBigUp,
  Key,
  Loader2,
  CloudUpload,
  RadioTower,
  Bot,
  ShieldUser,
  Plus,
  ArrowRight,
} from "lucide-react";
import { CheckIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import WertFundButton from "@/components/wallet/buy/wert-fund-button";
import { LoginButton } from "@/components/auth/LoginButton";
import { AlchemySwapWidget } from "@/components/wallet/swap/AlchemySwapWidget";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import { TokenBalance } from "@/components/wallet/balance/TokenBalance";
import { MeTokenBalances } from "@/components/wallet/balance/MeTokenBalances";
import makeBlockie from "ethereum-blockies-base64";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useSessionKey } from "@/lib/hooks/accountkit/useSessionKey";
import {
  HookType,
  getDefaultSingleSignerValidationModuleAddress,
  SingleSignerValidationModule,
  getDefaultTimeRangeModuleAddress,
  TimeRangeModule,
  getDefaultNativeTokenLimitModuleAddress,
  NativeTokenLimitModule,
  getDefaultAllowlistModuleAddress,
  AllowlistModule,
  installValidationActions,
} from "@account-kit/smart-contracts/experimental";
import { parseEther, type Address, type Hex, encodeFunctionData, parseAbi, parseUnits, formatUnits, erc20Abi } from "viem";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { USDC_TOKEN_ADDRESSES, USDC_TOKEN_DECIMALS } from "@/lib/contracts/USDCToken";
import { DAI_TOKEN_ADDRESSES, DAI_TOKEN_DECIMALS } from "@/lib/contracts/DAIToken";
import { useSessionKeyStorage } from "@/lib/hooks/accountkit/useSessionKeyStorage";
import { MembershipSection } from "./MembershipSection";
import { shortenAddress } from "@/lib/utils/utils";
import Link from "next/link";
import { useMembershipVerification } from "@/lib/hooks/unlock/useMembershipVerification";
import { Skeleton } from "@/components/ui/skeleton";
import { chains } from "@/config";
import { HydrationSafe } from "@/components/ui/hydration-safe";

const chainIconMap: Record<number, string> = {
  [base.id]: "/images/chains/base.svg",
  [optimism.id]: "/images/chains/optimism.svg",
};

function getChainIcon(chain: { id: number }) {
  return chainIconMap[chain.id] || "/images/chains/default.svg";
}

function NetworkStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center">
      {isConnected ? (
        <svg
          className="h-3 w-3 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg
          className="h-3 w-3 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill="currentColor"
          />
        </svg>
      )}
    </div>
  );
}

interface SessionKeyConfig {
  type: "global" | "time-limited" | "token-limited" | "allowlist";
  permissions: {
    isGlobal: boolean;
    timeLimit?: number;
    spendingLimit?: bigint;
    allowedAddresses?: string[];
    allowedFunctions?: string[];
  };
}

// Token configuration for send modal
type TokenSymbol = 'ETH' | 'USDC' | 'DAI';

const TOKEN_INFO = {
  ETH: { 
    decimals: 18, 
    symbol: "ETH",
    address: null, // Native token
  },
  USDC: { 
    decimals: USDC_TOKEN_DECIMALS, 
    symbol: "USDC",
    address: USDC_TOKEN_ADDRESSES.base,
  },
  DAI: { 
    decimals: DAI_TOKEN_DECIMALS, 
    symbol: "DAI",
    address: DAI_TOKEN_ADDRESSES.base,
  },
} as const;

const SESSION_KEY_TYPES: SessionKeyConfig[] = [
  {
    type: "global",
    permissions: {
      isGlobal: true,
    },
  },
  {
    type: "time-limited",
    permissions: {
      isGlobal: false,
      timeLimit: 24 * 60 * 60, // 24 hours
    },
  },
  {
    type: "token-limited",
    permissions: {
      isGlobal: false,
      spendingLimit: parseEther("1"), // 1 ETH
    },
  },
  {
    type: "allowlist",
    permissions: {
      isGlobal: false,
      allowedAddresses: [],
      allowedFunctions: [],
    },
  },
];

export function AccountDropdown() {
  const { openAuthModal } = useAuthModal();
  const user = useUser();
  const { logout } = useLogout();
  const { chain, setChain, isSettingChain } = useChain();
  const [displayAddress, setDisplayAddress] = useState<string>("");
  const [isNetworkConnected, setIsNetworkConnected] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isArrowUp, setIsArrowUp] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [dialogAction, setDialogAction] = useState<
    "buy" | "send" | "swap" | "session-keys"
  >("buy");
  const { sessionKeys, addSessionKey, removeSessionKey } =
    useSessionKeyStorage();
  const [selectedKeyType, setSelectedKeyType] = useState<SessionKeyConfig>(
    SESSION_KEY_TYPES[0]
  );
  const [customAddress, setCustomAddress] = useState<string>("");
  const [customSpendLimit, setCustomSpendLimit] = useState<string>("1");
  const [customTimeLimit, setCustomTimeLimit] = useState<string>("24");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [sendAmount, setSendAmount] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>('ETH');
  const [tokenBalances, setTokenBalances] = useState<Record<TokenSymbol, string>>({
    ETH: '0',
    USDC: '0',
    DAI: '0',
  });
  const { toast } = useToast();
  const [isLinksLoading, setIsLinksLoading] = useState(false);

  const { createSessionKey, isInstalling } = useSessionKey({
    permissions: {
      isGlobal: false,
      allowedFunctions: [],
      timeLimit: 24 * 60 * 60, // 24 hours
      spendingLimit: BigInt(1e18), // 1 ETH
    },
  });

  const { account } = useModularAccount();
  const { client } = useSmartAccountClient({});
  const validationClient = chain
    ? (client?.extend(installValidationActions as any) as any)
    : undefined;
  const { sendUserOperation, isSendingUserOperation } = useSendUserOperation({
    client,
    waitForTxn: true,
    onSuccess: ({ hash, request }) => {
      const explorerUrl = `${chain.blockExplorers?.default.url}/tx/${hash}`;
      console.log("Transaction hash:", hash);
      toast({
        title: "Transaction Successful!",
        description: "Your transaction has been confirmed.",
        action: (
          <ToastAction
            altText="View on Explorer"
            onClick={() => window.open(explorerUrl, "_blank")}
          >
            View on Explorer
          </ToastAction>
        ),
      });
      setIsDialogOpen(false);
      setRecipientAddress("");
      setSendAmount("");
    },
    onError: (error: Error) => {
      console.error("Error sending transaction:", error);
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description:
          error.message || "Something went wrong with your transaction.",
      });
    },
  });

  const { isVerified, hasMembership } = useMembershipVerification();

  useEffect(() => {
    console.log({
      "EOA Address (user.address)": user?.address,
      "Smart Contract Account Address": account?.address,
    });
  }, [account, user]);

  useEffect(() => {
    let newDisplayAddress = "";
    if (user?.type === "eoa" && user?.address)
      newDisplayAddress = `${user.address.slice(0, 6)}...${user.address.slice(
        -4
      )}`;
    else if (account?.address)
      newDisplayAddress = `${account.address.slice(
        0,
        6
      )}...${account.address.slice(-4)}`;
    // Only update if value actually changes
    if (displayAddress !== newDisplayAddress)
      setDisplayAddress(newDisplayAddress);
  }, [user, account, displayAddress]);

  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        if (user?.type === "eoa") {
          setIsNetworkConnected(true);
          return;
        }
        setIsNetworkConnected(true);
      } catch {
        setIsNetworkConnected(false);
      }
    };
    const interval = setInterval(checkNetworkStatus, 10000);
    checkNetworkStatus();
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    setIsDialogOpen(false);
  }, [user]);

  // Fetch token balances when dialog opens with send action
  useEffect(() => {
    const fetchTokenBalances = async () => {
      if (!client || !account?.address || dialogAction !== 'send' || !isDialogOpen) return;

      try {
        // Get ETH balance
        const ethBalance = await client.getBalance({
          address: account.address as Address,
        });
        
        // Get USDC balance
        const usdcBalance = await client.readContract({
          address: USDC_TOKEN_ADDRESSES.base as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [account.address as Address],
        }) as bigint;
        
        // Get DAI balance
        const daiBalance = await client.readContract({
          address: DAI_TOKEN_ADDRESSES.base as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [account.address as Address],
        }) as bigint;

        setTokenBalances({
          ETH: formatUnits(ethBalance, 18),
          USDC: formatUnits(usdcBalance, USDC_TOKEN_DECIMALS),
          DAI: formatUnits(daiBalance, DAI_TOKEN_DECIMALS),
        });
      } catch (error) {
        console.error('Error fetching token balances:', error);
      }
    };

    fetchTokenBalances();
  }, [client, account?.address, dialogAction, isDialogOpen]);

  const copyToClipboard = async () => {
    const addressToCopy =
      user?.type === "eoa" ? user?.address : account?.address;
    if (addressToCopy) {
      try {
        await navigator.clipboard.writeText(addressToCopy);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        // Optionally close dropdown after copying
        // setIsDropdownOpen(false);
      } catch {}
    }
  };

  const handleActionClick = (
    action: "buy" | "send" | "swap" | "session-keys"
  ) => {
    setDialogAction(action);
    setIsDialogOpen(true);
    setIsDropdownOpen(false); // Close dropdown when action is clicked
  };

  const handleChainSwitch = async (newChain: any) => {
    if (isSettingChain) return;
    if (chain.id === newChain.id) return;
    setChain({ chain: newChain });
  };

  const handleCreateSessionKey = async () => {
    if (!account?.address) return;

    try {
      const sessionKeyEntityId = sessionKeys.length + 1;
      const ecdsaValidationModuleAddress =
        getDefaultSingleSignerValidationModuleAddress(chain);
      const hookEntityId = sessionKeys.length; // Use different hook IDs for each key

      let hooks = [];

      switch (selectedKeyType.type) {
        case "time-limited":
          hooks.push({
            hookConfig: {
              address: getDefaultTimeRangeModuleAddress(chain),
              entityId: hookEntityId,
              hookType: HookType.VALIDATION,
              hasPreHooks: true,
              hasPostHooks: false,
            },
            initData: TimeRangeModule.encodeOnInstallData({
              entityId: hookEntityId,
              validAfter: Math.floor(Date.now() / 1000),
              validUntil:
                Math.floor(Date.now() / 1000) +
                parseInt(customTimeLimit) * 60 * 60,
            }),
          });
          break;

        case "token-limited":
          hooks.push({
            hookConfig: {
              address: getDefaultNativeTokenLimitModuleAddress(chain),
              entityId: hookEntityId,
              hookType: HookType.VALIDATION,
              hasPreHooks: true,
              hasPostHooks: false,
            },
            initData: NativeTokenLimitModule.encodeOnInstallData({
              entityId: hookEntityId,
              spendLimit: parseEther(customSpendLimit),
            }),
          });
          break;

        case "allowlist":
          if (customAddress) {
            hooks.push({
              hookConfig: {
                address: getDefaultAllowlistModuleAddress(chain),
                entityId: hookEntityId,
                hookType: HookType.VALIDATION,
                hasPreHooks: true,
                hasPostHooks: false,
              },
              initData: AllowlistModule.encodeOnInstallData({
                entityId: hookEntityId,
                inputs: [
                  {
                    target: customAddress as `0x${string}`,
                    hasSelectorAllowlist: false,
                    hasERC20SpendLimit: false,
                    erc20SpendLimit: parseEther("0"),
                    selectors: [],
                  },
                ],
              }),
            });
          }
          break;
      }

      const result = await createSessionKey();
      if (result) {
        const newSessionKey = {
          address: result.sessionKeyAddress,
          privateKey: result.sessionKeyPrivate,
          entityId: result.entityId,
          permissions: {
            ...selectedKeyType.permissions,
            timeLimit:
              selectedKeyType.type === "time-limited"
                ? parseInt(customTimeLimit) * 60 * 60
                : undefined,
            spendingLimit:
              selectedKeyType.type === "token-limited"
                ? parseEther(customSpendLimit)
                : undefined,
            allowedAddresses:
              selectedKeyType.type === "allowlist"
                ? [customAddress]
                : undefined,
          },
        };
        addSessionKey(newSessionKey);
      }
    } catch (error) {
      console.error("Error creating session key:", error);
    }
  };

  const handleSend = async () => {
    if (!client || !recipientAddress || !sendAmount) return;

    // Check balance
    const availableBalance = parseFloat(tokenBalances[selectedToken]);
    const requestedAmount = parseFloat(sendAmount);
    
    if (requestedAmount > availableBalance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: `You have ${availableBalance} ${selectedToken}, but trying to send ${requestedAmount} ${selectedToken}`,
      });
      return;
    }

    try {
      setIsSending(true);
      toast({
        title: "Transaction Initiated",
        description: `Sending ${sendAmount} ${selectedToken}...`,
      });

      const tokenInfo = TOKEN_INFO[selectedToken];

      if (selectedToken === 'ETH') {
        // Send native ETH
        const valueInWei = parseUnits(sendAmount, tokenInfo.decimals);

        sendUserOperation({
          uo: {
            target: recipientAddress as `0x${string}`,
            data: "0x" as Hex,
            value: valueInWei,
          },
        });
      } else {
        // Send ERC-20 token (USDC or DAI)
        const tokenAmount = parseUnits(sendAmount, tokenInfo.decimals);
        
        // Encode the transfer calldata
        const transferCalldata = encodeFunctionData({
          abi: parseAbi(["function transfer(address,uint256) returns (bool)"]),
          functionName: "transfer",
          args: [recipientAddress as Address, tokenAmount],
        });

        console.log('Sending ERC-20 transfer:', {
          token: selectedToken,
          tokenAddress: tokenInfo.address,
          recipient: recipientAddress,
          amount: tokenAmount.toString(),
        });

        sendUserOperation({
          uo: {
            target: tokenInfo.address as Address,
            data: transferCalldata as Hex,
            value: BigInt(0), // No native value for ERC-20 transfers
          },
        });
      }
    } catch (error: unknown) {
      console.error("Error sending transaction:", error);
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to initiate transaction.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRemoveSessionKey = async (sessionKey: any) => {
    if (!validationClient || !account?.address || !chain) return;

    try {
      const sessionKeyEntityId = sessionKeys.indexOf(sessionKey) + 1;

      const tx = await validationClient.uninstallValidation({
        moduleAddress: getDefaultSingleSignerValidationModuleAddress(chain),
        entityId: sessionKeyEntityId,
        uninstallData: SingleSignerValidationModule.encodeOnUninstallData({
          entityId: sessionKeyEntityId,
        }),
        hookUninstallDatas: [],
      });

      // Wait for transaction confirmation
      await tx.wait();

      // Only remove from local storage after successful on-chain removal
      removeSessionKey(sessionKey.address);

      toast({
        title: "Session Key Removed",
        description:
          "The session key has been successfully uninstalled on-chain.",
        action: (
          <ToastAction
            altText="View on Explorer"
            onClick={() =>
              window.open(
                `${chain.blockExplorers?.default.url}/tx/${tx.hash}`,
                "_blank"
              )
            }
          >
            View on Explorer
          </ToastAction>
        ),
      });
    } catch (error) {
      console.error("Error removing session key:", error);
      toast({
        variant: "destructive",
        title: "Error Removing Session Key",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while removing the session key.",
      });
      // Re-throw to prevent local storage removal on failure
      throw error;
    }
  };

  const getDialogContent = () => {
    switch (dialogAction) {
      case "buy":
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Purchase crypto directly to your wallet.
            </p>
            <div className="flex flex-col gap-4">
              <WertFundButton />
            </div>
          </div>
        );
      case "send":
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Send ETH, USDC, or DAI to another wallet address.
            </p>
            <div className="flex flex-col gap-4">
              {/* Token Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Token</label>
                <select
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value as TokenSymbol)}
                >
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                  <option value="DAI">DAI</option>
                </select>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Balance: {parseFloat(tokenBalances[selectedToken]).toFixed(6)} {selectedToken}</span>
                  <button
                    type="button"
                    onClick={() => setSendAmount(tokenBalances[selectedToken])}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Recipient Address */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount ({selectedToken})</label>
                <input
                  type="number"
                  placeholder="0.0"
                  step="any"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSend}
                disabled={
                  isSending ||
                  isSendingUserOperation ||
                  !recipientAddress ||
                  !sendAmount
                }
              >
                {isSending || isSendingUserOperation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending {selectedToken}...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send {selectedToken}
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      case "swap":
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Swap between different cryptocurrencies using Alchemy Smart Wallets.
            </p>
            <div className="space-y-4">
              <AlchemySwapWidget 
                onSwapSuccess={() => {
                  setIsDialogOpen(false);
                  toast({
                    title: "Swap Completed",
                    description: "Your token swap was successful!",
                  });
                }}
                className="border-0 shadow-none bg-transparent"
              />
            </div>
          </div>
        );
      case "session-keys":
        if (user?.type === "eoa") {
          setIsDialogOpen(false);
          return null;
        }
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Manage session keys for your smart account. Session keys allow you
              to delegate specific permissions to other signers.
            </p>
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm">Key Type</label>
                <select
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={selectedKeyType.type}
                  onChange={(e) =>
                    setSelectedKeyType(
                      SESSION_KEY_TYPES.find(
                        (t) => t.type === e.target.value
                      ) || SESSION_KEY_TYPES[0]
                    )
                  }
                >
                  <option value="global">Global Access</option>
                  <option value="time-limited">Time Limited</option>
                  <option value="token-limited">Token Limited</option>
                  <option value="allowlist">Address Allowlist</option>
                </select>

                {selectedKeyType.type === "time-limited" && (
                  <div className="space-y-2 mt-4">
                    <label className="text-sm">Time Limit (hours)</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      value={customTimeLimit}
                      onChange={(e) => setCustomTimeLimit(e.target.value)}
                    />
                  </div>
                )}

                {selectedKeyType.type === "token-limited" && (
                  <div className="space-y-2 mt-4">
                    <label className="text-sm">Spend Limit (ETH)</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      value={customSpendLimit}
                      onChange={(e) => setCustomSpendLimit(e.target.value)}
                    />
                  </div>
                )}

                {selectedKeyType.type === "allowlist" && (
                  <div className="space-y-2 mt-4">
                    <label className="text-sm">Allowed Address</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="0x..."
                    />
                  </div>
                )}
              </div>

              <Button
                className="w-full mt-4"
                onClick={handleCreateSessionKey}
                disabled={isInstalling}
              >
                {isInstalling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create New Session Key"
                )}
              </Button>

              <div className="space-y-2 mt-4">
                <h3 className="text-sm font-medium">Active Session Keys</h3>
                {sessionKeys.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No active session keys
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {sessionKeys.map((key, index) => (
                      <div
                        key={key.address}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-mono">
                            {key.address.slice(0, 6)}...{key.address.slice(-4)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {key.permissions.isGlobal
                              ? "Global Access"
                              : key.permissions.timeLimit
                              ? `Time Limited (${Math.floor(
                                  key.permissions.timeLimit / 3600
                                )}h)`
                              : key.permissions.spendingLimit
                              ? `Spend Limited (${key.permissions.spendingLimit} ETH)`
                              : "Limited Access"}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveSessionKey(key)}
                          className="ml-2"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return <LoginButton />;
  }

  return (
    <div className="flex items-center gap-2">
      <HydrationSafe
        fallback={
          <Button
            variant="outline"
            className="gap-2 items-center transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-500 hidden md:flex"
          >
            <div className="relative">
              <Image
                src={getChainIcon(chain)}
                alt={`${chain.name} network icon`}
                width={32}
                height={32}
                className="rounded-full"
              />
              <div className="absolute -bottom-1 -right-1">
                <NetworkStatus isConnected={isNetworkConnected} />
              </div>
            </div>
            <span>{chain.name}</span>
          </Button>
        }
      >
        <TooltipProvider>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 items-center transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-500 hidden md:flex"
                  >
                    <div className="relative">
                      <Image
                        src={getChainIcon(chain)}
                        alt={`${chain.name} network icon`}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      <div className="absolute -bottom-1 -right-1">
                        <NetworkStatus isConnected={isNetworkConnected} />
                      </div>
                    </div>
                    <span>{chain.name}</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <pre className="text-xs">{chain.name}</pre>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className="animate-in fade-in-80 slide-in-from-top-5"
            >
              <DropdownMenuLabel className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                Switch Network
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {chains.map((dropdownChain) => (
                <Tooltip key={dropdownChain.id}>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onClick={() => handleChainSwitch(dropdownChain)}
                      disabled={isSettingChain || chain.id === dropdownChain.id}
                      className={`
                        flex items-center cursor-pointer
                        hover:bg-gray-100 dark:hover:bg-gray-800
                        transition-colors
                      `}
                    >
                      <Image
                        src={getChainIcon(dropdownChain)}
                        alt={`${dropdownChain.name} network icon`}
                        width={32}
                        height={32}
                        className="mr-2 rounded-full"
                      />
                      {dropdownChain.name}
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <pre className="text-xs">{dropdownChain.name}</pre>
                  </TooltipContent>
                </Tooltip>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      </HydrationSafe>

      {/* Desktop Dropdown */}
      <HydrationSafe
        fallback={
          <Button
            variant="outline"
            className="hidden md:flex items-center gap-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-500"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={makeBlockie(account?.address || user?.address || "0x")}
                alt="Wallet avatar"
              />
            </Avatar>
            <span className="max-w-[100px] truncate">
              {displayAddress || "Loading..."}
            </span>
          </Button>
        }
      >
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="hidden md:flex items-center gap-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-500"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={makeBlockie(account?.address || user?.address || "0x")}
                alt="Wallet avatar"
              />
            </Avatar>
            <span className="max-w-[100px] truncate">
              {displayAddress || "Loading..."}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[320px] md:w-80 max-h-[80vh] overflow-y-auto"
          align="end"
        >
          <DropdownMenuLabel className="font-normal">
            <div
              className={`flex items-center justify-between cursor-pointer 
              hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 transition-colors`}
              onClick={copyToClipboard}
            >
              <div className="flex flex-col space-y-1">
                <p className="text-xs text-gray-500">
                  {user?.type === "eoa" ? "EOA" : "Smart Account"}
                </p>
                <p className="font-mono text-sm">{displayAddress}</p>
                {user?.type !== "eoa" && user?.address && (
                  <p className="text-xs text-gray-500">
                    Controller: {shortenAddress(user.address)}
                  </p>
                )}
              </div>
              {copySuccess ? (
                <CheckIcon className="ml-2 h-4 w-4 text-green-500" />
              ) : (
                <Copy className="ml-2 h-4 w-4" />
              )}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Balances Section */}
          <div className="px-2 py-2">
            <TokenBalance />
          </div>

          <DropdownMenuSeparator />

          {/* MeToken Balances Section */}
          <div className="px-2 py-2">
            <MeTokenBalances />
          </div>

          <DropdownMenuSeparator />

          {/* Wallet Actions Section - Grid Layout */}
          <div className="px-2 py-2 w-full">
            <p className="text-xs text-muted-foreground mb-2">Actions</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleActionClick("buy")}
                className="flex flex-col items-center justify-center p-3 h-16 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Plus className="h-4 w-4 text-green-500 mb-1" />
                <span className="text-xs">Add</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleActionClick("send")}
                className="flex flex-col items-center justify-center p-3 h-16 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowUpRight className="h-4 w-4 text-blue-500 mb-1" />
                <span className="text-xs">Send</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleActionClick("swap")}
                className="flex flex-col items-center justify-center p-3 h-16 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowUpDown className="h-4 w-4 text-purple-500 mb-1" />
                <span className="text-xs">Swap</span>
              </Button>
            </div>
          </div>

          <DropdownMenuSeparator />
          

          {/* Profile & Upload Access - Always Available */}
          <div className="px-2 py-2 w-full">
            <p className="text-xs text-muted-foreground mb-2">
              Options
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/profile" className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    "w-full flex flex-col items-center justify-center p-2 h-12 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  }
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <ShieldUser className="h-3 w-3 mb-1" />
                  <span className="text-xs">Profile</span>
                </Button>
              </Link>
              <Link href="/upload" className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    "w-full flex flex-col items-center justify-center p-2 h-12 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  }
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <CloudUpload className="h-3 w-3 mb-1" />
                  <span className="text-xs">Upload</span>
                </Button>
              </Link>
            </div>
          </div>
          <DropdownMenuSeparator />
          {/* Membership Section */}
          <div className="px-2 py-2 w-full">
            <MembershipSection />
          </div>

          {/* Member Access Links - Only for Members */}
          {isVerified && hasMembership && (
            <>
              
              <div className="px-2 py-2 w-full">
                <p className="text-xs text-muted-foreground mb-2">
                  Member Access
                </p>
                {isLinksLoading ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/live" className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className={
                          "w-full flex flex-col items-center justify-center p-2 h-12 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        }
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <RadioTower className="h-3 w-3 mb-1" />
                        <span className="text-xs">Live</span>
                      </Button>
                    </Link>
                    <Link href="/clips" className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full flex flex-col items-center justify-center p-2 h-12 hover:bg-gray-50 
                          dark:hover:bg-gray-800 transition-colors relative"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <Bot className="h-3 w-3 mb-1" />
                        <span className="text-xs">Daydream</span>
                        <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded bg-blue-500 text-white text-[8px]">
                          Beta
                        </span>
                      </Button>
                    </Link>
                    <Link href="/vote/create" className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full flex flex-col items-center justify-center p-2 h-12 hover:bg-green-50 
                          dark:hover:bg-green-900 transition-colors text-green-600 dark:text-green-400 
                          font-medium border-green-200 dark:border-green-800"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <Plus className="h-3 w-3 mb-1" />
                        <span className="text-xs">Start Vote</span>
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
              <DropdownMenuSeparator />

          {/* Session Keys Section - Compact */}
          {user?.type !== "eoa" && (
            <>
              <div className="px-2 py-1 w-full">
                <DropdownMenuItem
                  onClick={() => handleActionClick("session-keys")}
                  className="w-full flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors p-2 rounded"
                >
                  <Key className="mr-2 h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Session Keys</span>
                  <ArrowRight className="ml-auto h-3 w-3" />
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Logout */}
          <div className="px-2 py-1 w-full">
            <DropdownMenuItem
              onClick={() => {
                logout();
                setIsDropdownOpen(false);
              }}
              className="w-full flex items-center cursor-pointer hover:bg-red-50 dark:hover:bg-red-900 transition-colors p-2 text-red-500 rounded"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="text-sm">Logout</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
        </DropdownMenu>
      </HydrationSafe>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setDialogAction("buy");
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] w-[95%] md:w-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogAction.charAt(0).toUpperCase() + dialogAction.slice(1)}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "buy" &&
                "Purchase cryptocurrency directly to your wallet using your preferred payment method."}
              {dialogAction === "send" &&
                "Transfer cryptocurrency to another wallet address securely."}
              {dialogAction === "swap" &&
                "Exchange one cryptocurrency for another at the best available rates."}
            </DialogDescription>
            <DialogClose asChild className="absolute right-4 top-4" />
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {getDialogContent()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
