"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRightLeft, CheckCircle, XCircle, ExternalLink, DollarSign } from 'lucide-react';
import Image from 'next/image';
import { useSmartAccountClient } from '@account-kit/react';
import { type Hex, type Address, parseEther, formatEther, encodeFunctionData, erc20Abi, parseUnits, maxUint256 } from 'viem';
import { alchemySwapService, AlchemySwapService, type TokenSymbol, BASE_TOKENS, TOKEN_INFO } from '@/lib/sdk/alchemy/swap-service';
import { priceService, PriceService } from '@/lib/sdk/alchemy/price-service';
import { CurrencyConverter } from '@/lib/utils/currency-converter';
import { useGasSponsorship } from '@/lib/hooks/wallet/useGasSponsorship';
import { logger } from '@/lib/utils/logger';

const getTokenIcon = (symbol: string, chainId?: number) => {
  const isBase = chainId === 8453;
  switch (symbol) {
    case "ETH":
      return isBase ? "/images/tokens/ETH_on_Base.svg" : "/images/tokens/eth-logo.svg";
    case "USDC":
      return isBase ? "/images/tokens/USDC_on_Base.svg" : "/images/tokens/usdc-logo.svg";
    case "DAI":
      return isBase ? "/images/tokens/DAI_on_Base.svg" : "/images/tokens/dai-logo.svg";
    default:
      return "/images/tokens/eth-logo.svg";
  }
};

interface AlchemySwapWidgetProps {
  onSwapSuccess?: () => void;
  className?: string;
  hideHeader?: boolean;
  defaultToToken?: TokenSymbol;
}

interface SwapState {
  fromToken: TokenSymbol;
  toToken: TokenSymbol;
  fromAmount: string;
  toAmount: string;
  isLoading: boolean;
  isSwapping: boolean;
  error: string | null;
  quote: any;
  transactionHash: string | null;
}

export function AlchemySwapWidget({ onSwapSuccess, className, hideHeader = false, defaultToToken = 'USDC' }: AlchemySwapWidgetProps) {
  const { address, client } = useSmartAccountClient({});
  const { getGasContext } = useGasSponsorship();

  const [swapState, setSwapState] = useState<SwapState>({
    fromToken: 'ETH',
    toToken: defaultToToken,
    fromAmount: '',
    toAmount: '',
    isLoading: false,
    isSwapping: false,
    error: null,
    quote: null,
    transactionHash: null,
  });

  const [isApprovingToken, setIsApprovingToken] = useState(false);

  const [balances, setBalances] = useState<Record<TokenSymbol, string>>({
    ETH: '0',
    USDC: '0',
    DAI: '0',
  });

  const [prices, setPrices] = useState<Record<TokenSymbol, number>>({
    ETH: 0,
    USDC: 0,
    DAI: 0,
  });

  const [usdValues, setUsdValues] = useState<{
    fromAmount: number;
    toAmount: number;
  }>({
    fromAmount: 0,
    toAmount: 0,
  });

  const [inputMode, setInputMode] = useState<'token' | 'usd'>('usd'); // Default to USD mode
  const [usdInput, setUsdInput] = useState<string>('');

  // Fetch token prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const tokenPrices = await priceService.getTokenPrices(['ETH', 'USDC', 'DAI']);
        setPrices(tokenPrices);
      } catch (error) {
        logger.error('Error fetching prices:', error);
      }
    };

    fetchPrices();
    // Refresh prices every minute
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate USD values when amounts change
  useEffect(() => {
    const calculateUsdValues = async () => {
      if (swapState.fromAmount && parseFloat(swapState.fromAmount) > 0) {
        const fromUsd = await priceService.convertToUSD(
          parseFloat(swapState.fromAmount),
          swapState.fromToken
        );
        setUsdValues(prev => ({ ...prev, fromAmount: fromUsd }));
      } else {
        setUsdValues(prev => ({ ...prev, fromAmount: 0 }));
      }

      if (swapState.toAmount && parseFloat(swapState.toAmount) > 0) {
        const toUsd = await priceService.convertToUSD(
          parseFloat(swapState.toAmount),
          swapState.toToken
        );
        setUsdValues(prev => ({ ...prev, toAmount: toUsd }));
      } else {
        setUsdValues(prev => ({ ...prev, toAmount: 0 }));
      }
    };

    calculateUsdValues();
  }, [swapState.fromAmount, swapState.toAmount, swapState.fromToken, swapState.toToken]);

  // Fetch token balances
  useEffect(() => {
    if (!address || !client) return;

    const fetchBalances = async () => {
      try {
        logger.debug('Fetching balances for address:', address);

        // Get ETH balance
        const ethBalance = await client.getBalance({
          address: address as Address,
        });

        logger.debug('ETH balance (wei):', ethBalance.toString());

        // Get USDC balance (ERC20)
        let usdcBalance = 0n;
        try {
          usdcBalance = await client.readContract({
            address: BASE_TOKENS.USDC as Address,
            abi: [{
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: 'balance', type: 'uint256' }],
            }],
            functionName: 'balanceOf',
            args: [address as Address],
          }) as bigint;
        } catch (e) {
          logger.warn('Failed to fetch USDC balance:', e);
        }

        // Get DAI balance (ERC20)
        let daiBalance = 0n;
        try {
          daiBalance = await client.readContract({
            address: BASE_TOKENS.DAI as Address,
            abi: [{
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: 'balance', type: 'uint256' }],
            }],
            functionName: 'balanceOf',
            args: [address as Address],
          }) as bigint;
        } catch (e) {
          logger.warn('Failed to fetch DAI balance:', e);
        }

        const newBalances: Record<TokenSymbol, string> = {
          ETH: AlchemySwapService.parseAmount(`0x${ethBalance.toString(16)}` as Hex, 'ETH'),
          USDC: AlchemySwapService.parseAmount(`0x${usdcBalance.toString(16)}` as Hex, 'USDC'),
          DAI: AlchemySwapService.parseAmount(`0x${daiBalance.toString(16)}` as Hex, 'DAI'),
        };

        logger.debug('Parsed balances:', newBalances);
        setBalances(newBalances);

        // Check if the account has any ETH at all
        if (ethBalance === 0n) {
          logger.warn('Account has zero ETH balance. This may cause swap failures.');
          setSwapState(prev => ({
            ...prev,
            error: 'Account has zero ETH balance. You need ETH for gas fees to perform swaps. Please add some ETH to your account first.'
          }));
        } else {
          // Clear any previous balance-related errors
          setSwapState(prev => ({
            ...prev,
            error: prev.error?.includes('zero ETH balance') ? null : prev.error
          }));
        }

      } catch (error) {
        logger.error('Error fetching balances:', error);
      }
    };

    fetchBalances();
  }, [address, client]);

  const fetchQuote = async (amount: string, fromToken: TokenSymbol, toToken: TokenSymbol) => {
    if (!amount || parseFloat(amount) <= 0 || !address) {
      setSwapState(prev => ({ ...prev, fromAmount: amount, quote: null, error: null }));
      return;
    }

    try {
      setSwapState(prev => ({ ...prev, isLoading: true, error: null }));

      const fromAmountHex = AlchemySwapService.formatAmount(amount, fromToken);

      logger.debug('Requesting swap quote:', {
        from: address,
        fromToken,
        toToken,
        fromAmount: amount,
        fromAmountHex,
      });

      const quoteResponse = await alchemySwapService.requestSwapQuote({
        from: address as Address,
        fromToken,
        toToken,
        fromAmount: fromAmountHex,
      });

      if (quoteResponse.result?.quote) {
        const toAmount = AlchemySwapService.parseAmount(
          quoteResponse.result.quote.minimumToAmount,
          toToken
        );

        setSwapState(prev => ({
          ...prev,
          fromAmount: amount,
          toAmount,
          quote: quoteResponse.result,
          isLoading: false,
        }));
      } else {
        setSwapState(prev => ({ ...prev, isLoading: false, quote: null }));
      }
    } catch (error) {
      logger.error('Error getting quote:', error);
      setSwapState(prev => ({
        ...prev,
        isLoading: false,
        quote: null,
        error: error instanceof Error ? error.message : 'Failed to get quote',
      }));
    }
  };

  const handleFromTokenChange = async (value: string) => {
    const newFromToken = value as TokenSymbol;
    const currentToToken = swapState.toToken;
    let newToToken = currentToToken;

    // If selecting same token as destination, swap them
    if (newFromToken === currentToToken) {
      newToToken = swapState.fromToken;
    }

    setSwapState(prev => ({
      ...prev,
      fromToken: newFromToken,
      toToken: newToToken,
    }));

    // Re-fetch quote if we have an amount
    if (swapState.fromAmount && parseFloat(swapState.fromAmount) > 0) {
      await fetchQuote(swapState.fromAmount, newFromToken, newToToken);
    }
  };

  const handleToTokenChange = async (value: string) => {
    const newToToken = value as TokenSymbol;
    const currentFromToken = swapState.fromToken;
    let newFromToken = currentFromToken;

    // If selecting same token as source, swap them
    if (newToToken === currentFromToken) {
      newFromToken = swapState.toToken;
    }

    setSwapState(prev => ({
      ...prev,
      fromToken: newFromToken,
      toToken: newToToken,
    }));

    // Re-fetch quote if we have an amount
    if (swapState.fromAmount && parseFloat(swapState.fromAmount) > 0) {
      await fetchQuote(swapState.fromAmount, newFromToken, newToToken);
    }
  };

  const handleFromAmountChange = async (value: string) => {
    setSwapState(prev => ({ ...prev, fromAmount: value }));
    await fetchQuote(value, swapState.fromToken, swapState.toToken);
  };

  const handleUSDInputChange = async (value: string) => {
    setUsdInput(value);

    if (!value || parseFloat(value) <= 0) {
      setSwapState(prev => ({ ...prev, fromAmount: '', toAmount: '', quote: null, error: null }));
      return;
    }

    if (!address || !client) return;

    try {
      setSwapState(prev => ({ ...prev, isLoading: true, error: null }));

      // Convert USD to token amount
      const tokenAmount = await priceService.convertFromUSD(
        parseFloat(value),
        swapState.fromToken
      );

      // Check balance before requesting quote
      const availableBalance = parseFloat(balances[swapState.fromToken]);
      if (tokenAmount > availableBalance) {
        const maxUSD = await priceService.convertToUSD(availableBalance, swapState.fromToken);
        setSwapState(prev => ({
          ...prev,
          isLoading: false,
          error: `Insufficient balance. You can swap up to ${PriceService.formatUSD(maxUSD)} (${availableBalance.toFixed(6)} ${swapState.fromToken})`
        }));
        return;
      }

      // Update the token amount and trigger quote
      await handleFromAmountChange(tokenAmount.toFixed(6));
    } catch (error) {
      logger.error('Error converting USD to token:', error);
      setSwapState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to convert USD amount'
      }));
    }
  };

  const handleInputModeToggle = () => {
    setInputMode(prev => {
      const newMode = prev === 'token' ? 'usd' : 'token';

      // When switching to USD mode, calculate USD value from token amount
      if (newMode === 'usd' && swapState.fromAmount) {
        const calculateUSD = async () => {
          const usd = await priceService.convertToUSD(
            parseFloat(swapState.fromAmount),
            swapState.fromToken
          );
          setUsdInput(usd.toFixed(2));
        };
        calculateUSD();
      }

      return newMode;
    });
  };

  const handlePresetAmount = async (usdAmount: number) => {
    setInputMode('usd');
    setUsdInput(usdAmount.toString());
    await handleUSDInputChange(usdAmount.toString());
  };

  const handleMaxAmount = async () => {
    const availableBalance = parseFloat(balances[swapState.fromToken]);

    if (availableBalance <= 0) {
      setSwapState(prev => ({ ...prev, error: `No ${swapState.fromToken} balance available` }));
      return;
    }

    if (inputMode === 'usd') {
      // Convert max balance to USD
      const maxUSD = await priceService.convertToUSD(availableBalance, swapState.fromToken);
      setUsdInput(maxUSD.toFixed(2));
      await handleUSDInputChange(maxUSD.toFixed(2));
    } else {
      // Use max token balance
      await handleFromAmountChange(availableBalance.toFixed(6));
    }
  };

  const handleSwapTokens = async () => {
    const newFrom = swapState.toToken;
    const newTo = swapState.fromToken;
    const newFromAmount = swapState.toAmount;

    setSwapState(prev => ({
      ...prev,
      fromToken: newFrom,
      toToken: newTo,
      fromAmount: newFromAmount,
      toAmount: '', // Clear toAmount until new quote comes in
      quote: null
    }));

    if (newFromAmount && parseFloat(newFromAmount) > 0) {
      await fetchQuote(newFromAmount, newFrom, newTo);
    }
  };


  const handleExecuteSwap = async () => {
    if (!address || !swapState.quote || !client) return;

    try {
      setSwapState(prev => ({ ...prev, isSwapping: true, error: null }));

      logger.debug('Executing swap with structure:', swapState.quote);

      // ========== GAS SPONSORSHIP ==========
      // Determine gas sponsorship context (Member=Sponsored, Non-Member=USDC/ETH)
      // We need to fetch this outside the loop if possible, or inside if hook usage allows
      // Since this is an event handler, we rely on the hook values passed in
      // Note: We need to refactor slightly to access the getGasContext result

      // For now, we'll assume we pass the context manually to the sendUserOperation
      // But we need the values from the hook. Let's rely on the component scope variables.
      const gasContext = getGasContext('usdc');
      logger.debug('Gas Sponsorship Context:', gasContext);

      // ========== PRE-FLIGHT CHECKS ==========

      const ethBalance = await client.getBalance({ address });
      logger.debug('ETH Balance:', formatEther(ethBalance), 'ETH');

      let isDeployed = true;
      try {
        const code = await client.transport.request({
          method: "eth_getCode",
          params: [address, "latest"],
        }) as Hex;
        isDeployed = code && code.length > 2 && code !== '0x' && code !== '0x0';
        if (!isDeployed) logger.warn('Account appears not deployed.');
      } catch (error) {
        logger.warn('Deployment check failed:', error);
      }

      const minGasEth = parseEther('0.001');
      if (ethBalance < minGasEth) {
        logger.warn(`Low ETH balance (${formatEther(ethBalance)} ETH). Swap might fail if not sponsored.`);
      }

      logger.debug('Pre-flight checks passed');

      // ========== EXECUTE CALLS ==========

      // Use the raw calls returned by the API (includes Approval + Swap)
      // Note: We need to cast to any because the type definition update might not be picked up yet
      const calls = (swapState.quote as any).calls;

      if (calls && Array.isArray(calls) && calls.length > 0) {
        logger.debug(`Found ${calls.length} prepared calls from API`);

        let txHash: Hex | null = null;

        // Execute calls sequentially to ensure Approval confirms before Swap checks
        for (let i = 0; i < calls.length; i++) {
          const call = calls[i];
          const isLast = i === calls.length - 1;
          const description = i === 0 && calls.length > 1 ? 'Approval' : 'Swap';

          logger.debug(`Sending ${description} UserOperation (${i + 1}/${calls.length})...`, {
            target: call.to,
            value: call.value,
            dataLength: call.data.length
          });

          const executeOperation = async (context: any) => {
            return await client.sendUserOperation({
              uo: {
                target: call.to,
                data: call.data,
                value: BigInt(call.value || '0x0'),
              },
              context: context,
              overrides: {
                paymasterAndData: context ? undefined : undefined, // Explicit undefined to trigger default behavior if no context
              }
            });
          };

          let operation;
          // Try with preferred context (Sponsored or USDC)
          const primaryContext = gasContext.context;

          try {
            logger.debug(`Sending ${description} UserOperation (${i + 1}/${calls.length}) with context:`, primaryContext ? 'Custom' : 'Standard');
            operation = await executeOperation(primaryContext);
          } catch (err) {
            // If primary method fails (e.g. USDC payment fails), try fallback if it was a custom context
            if (primaryContext) {
              logger.warn(`Primary gas method failed, falling back to standard ETH payment...`, err);
              operation = await executeOperation(undefined);
            } else {
              throw err;
            }
          }

          logger.debug(`${description} UserOperation sent! Hash:`, operation.hash);

          // Wait for confirmation
          const receipt = await client.waitForUserOperationTransaction({
            hash: operation.hash,
          });

          logger.debug(`${description} confirmed! TxHash:`, receipt);

          if (isLast) {
            txHash = receipt;
          }
        }

        // Update state with success (use the last hash)
        setSwapState(prev => ({
          ...prev,
          transactionHash: txHash,
          isSwapping: false,
        }));

        onSwapSuccess?.();

      } else {
        // Fallback for legacy quote structure (UserOperation object)
        logger.warn('No raw calls found, attempting legacy UserOperation execution...');

        const quoteData = swapState.quote.data;
        const target = (quoteData.target || quoteData.sender || address) as Address;

        const operation = await client.sendUserOperation({
          uo: {
            target,
            data: quoteData.callData as Hex,
            value: BigInt(quoteData.value || '0x0'),
          },
        });

        const txHash = await client.waitForUserOperationTransaction({
          hash: operation.hash,
        });

        setSwapState(prev => ({
          ...prev,
          transactionHash: txHash,
          isSwapping: false,
        }));

        onSwapSuccess?.();
      }

    } catch (error) {
      logger.error('Swap failed:', error);
      setIsApprovingToken(false);

      let userMessage = 'Swap execution failed';
      const errorStr = error instanceof Error ? error.message : String(error);

      if (errorStr.includes('AA23')) {
        userMessage = 'Transaction validation failed (AA23). Check balances and gas.';
      } else if (errorStr.includes('Multicall3')) {
        userMessage = 'Swap failed (Multicall3). This often means the Swap Validation failed. Ensure you have USDC/ETH and the account is properly deployed.';
      } else {
        userMessage = errorStr;
      }

      setSwapState(prev => ({
        ...prev,
        error: userMessage,
        isSwapping: false,
      }));
    }
  };

  const canExecuteSwap =
    swapState.fromAmount &&
    parseFloat(swapState.fromAmount) > 0 &&
    swapState.quote &&
    !swapState.isLoading &&
    !swapState.isSwapping &&
    swapState.fromToken !== swapState.toToken;

  // Show loading state while wallet is connecting
  if (!address || !client) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Token Swap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting wallet...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Token Swap
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {swapState.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div>{swapState.error}</div>
              {swapState.error.includes('Insufficient balance') && address && (
                <div className="mt-2 text-xs">
                  <a
                    href={`/send?address=${address}`}
                    className="underline hover:text-destructive-foreground"
                  >
                    Add funds to your wallet
                  </a>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {address && balances[swapState.fromToken] && parseFloat(balances[swapState.fromToken]) === 0 && !swapState.error && (
          <Alert>
            <AlertDescription className="text-sm">
              You don&apos;t have any {swapState.fromToken} to swap.
              <a
                href={`/send?address=${address}`}
                className="ml-1 underline hover:text-primary"
              >
                Add funds to get started
              </a>
            </AlertDescription>
          </Alert>
        )}

        {swapState.transactionHash && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex items-center gap-2">
              Swap completed successfully!
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://basescan.org/tx/${swapState.transactionHash}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View on BaseScan
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* From Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">You Pay</label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMaxAmount}
                className="h-6 px-2 text-xs"
                disabled={swapState.isLoading || swapState.isSwapping || !address}
              >
                MAX
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleInputModeToggle}
                className="h-6 px-2 text-xs"
                disabled={swapState.isLoading || swapState.isSwapping}
              >
                <DollarSign className={`h-3 w-3 mr-1 ${inputMode === 'usd' ? 'text-green-600' : ''}`} />
                {inputMode === 'usd' ? 'USD' : swapState.fromToken}
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex items-center space-x-2 px-3 border rounded-md bg-background w-28 sm:w-32 h-10">
              {/* Native Select for Mobile */}
              <select
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer md:hidden"
                value={swapState.fromToken}
                onChange={(e) => handleFromTokenChange(e.target.value as TokenSymbol)}
              >
                <option value="ETH">ETH</option>
                <option value="USDC">USDC</option>
                <option value="DAI">DAI</option>
              </select>

              <Image
                src={getTokenIcon(swapState.fromToken, client?.chain?.id)}
                alt={swapState.fromToken}
                width={32}
                height={32}
                className="w-8 h-8 shrink-0"
              />
              <Select value={swapState.fromToken} onValueChange={handleFromTokenChange}>
                <SelectTrigger className="w-full bg-transparent border-none outline-none p-0 h-auto focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="DAI">DAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 relative">
              <Input
                type="number"
                placeholder={inputMode === 'usd' ? '0.00' : '0.0'}
                value={inputMode === 'usd' ? usdInput : swapState.fromAmount}
                onChange={(e) =>
                  inputMode === 'usd'
                    ? handleUSDInputChange(e.target.value)
                    : handleFromAmountChange(e.target.value)
                }
                className={inputMode === 'usd' ? 'pl-6 pr-20 h-10' : 'pr-20 h-10'}
                disabled={swapState.isLoading || swapState.isSwapping}
              />
              {inputMode === 'usd' && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  $
                </div>
              )}
              {inputMode === 'token' && usdValues.fromAmount > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  ≈ {PriceService.formatUSD(usdValues.fromAmount)}
                </div>
              )}
              {inputMode === 'usd' && swapState.fromAmount && parseFloat(swapState.fromAmount) > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  ≈ {parseFloat(swapState.fromAmount).toFixed(6)} {swapState.fromToken}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Image
                src={getTokenIcon(swapState.fromToken, client?.chain?.id)}
                alt={swapState.fromToken}
                width={20}
                height={20}
                className="w-5 h-5"
              />
              <span>Balance: {balances[swapState.fromToken]}</span>
            </div>
            {prices[swapState.fromToken] > 0 && (
              <span>@ {PriceService.formatUSD(prices[swapState.fromToken])}</span>
            )}
          </div>

          {/* Quick Amount Presets */}
          {inputMode === 'usd' && (
            <div className="space-y-2">
              <div className="flex gap-2 pt-1">
                {[10, 25, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetAmount(amount)}
                    disabled={swapState.isLoading || swapState.isSwapping || !address}
                    className="flex-1 h-8 text-xs"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              {address && balances[swapState.fromToken] && parseFloat(balances[swapState.fromToken]) > 0 && (
                <div className="text-xs text-muted-foreground text-right">
                  Max: ~{PriceService.formatUSD(
                    usdValues.fromAmount > 0
                      ? parseFloat(balances[swapState.fromToken]) * prices[swapState.fromToken]
                      : 0
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwapTokens}
            disabled={swapState.isLoading || swapState.isSwapping}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium">You Receive</label>
          <div className="flex gap-2">
            <div className="relative flex items-center space-x-2 px-3 border rounded-md bg-background w-28 sm:w-32 h-10">
              {/* Native Select for Mobile */}
              <select
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer md:hidden"
                value={swapState.toToken}
                onChange={(e) => handleToTokenChange(e.target.value as TokenSymbol)}
              >
                <option value="ETH">ETH</option>
                <option value="USDC">USDC</option>
                <option value="DAI">DAI</option>
              </select>

              <Image
                src={getTokenIcon(swapState.toToken, client?.chain?.id)}
                alt={swapState.toToken}
                width={32}
                height={32}
                className="w-8 h-8 shrink-0"
              />
              <Select value={swapState.toToken} onValueChange={handleToTokenChange}>
                <SelectTrigger className="w-full bg-transparent border-none outline-none p-0 h-auto focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="DAI">DAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 relative">
              <Input
                type="number"
                placeholder="0.0"
                value={swapState.toAmount}
                readOnly
                className="bg-muted pr-20 h-10"
              />
              {usdValues.toAmount > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  ≈ {PriceService.formatUSD(usdValues.toAmount)}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Image
                src={getTokenIcon(swapState.toToken, client?.chain?.id)}
                alt={swapState.toToken}
                width={20}
                height={20}
                className="w-5 h-5"
              />
              <span>Balance: {balances[swapState.toToken]}</span>
            </div>
            {prices[swapState.toToken] > 0 && (
              <span>@ {PriceService.formatUSD(prices[swapState.toToken])}</span>
            )}
          </div>
        </div>

        {/* Quote Information */}
        {swapState.quote && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="text-sm font-medium">Swap Quote</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Exchange Rate</span>
                <span>1 {swapState.fromToken} = {
                  (parseFloat(swapState.toAmount) / parseFloat(swapState.fromAmount)).toFixed(6)
                } {swapState.toToken}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">You Pay</span>
                <span>{swapState.fromAmount} {swapState.fromToken} ({PriceService.formatUSD(usdValues.fromAmount)})</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">You Receive</span>
                <span>{swapState.toAmount} {swapState.toToken} ({PriceService.formatUSD(usdValues.toAmount)})</span>
              </div>
              {swapState.quote.feePayment?.sponsored && (
                <div className="text-xs text-green-600 mt-2">
                  ✓ Gas sponsored by paymaster
                </div>
              )}
            </div>
          </div>
        )}

        {/* Execute Swap Button */}
        <Button
          onClick={handleExecuteSwap}
          disabled={!canExecuteSwap}
          className="w-full"
        >
          {isApprovingToken ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Approving {swapState.fromToken}...
            </>
          ) : swapState.isSwapping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing Swap...
            </>
          ) : swapState.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting Quote...
            </>
          ) : (
            <>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Execute Swap
            </>
          )}
        </Button>

        {/* Supported Tokens Info */}
        <div className="text-xs text-muted-foreground">
          <p>Supported tokens on Base: ETH, USDC, DAI</p>
          <p>Swaps powered by Alchemy Smart Wallets</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default AlchemySwapWidget;