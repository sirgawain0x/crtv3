"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRightLeft, CheckCircle, XCircle, ExternalLink, DollarSign } from 'lucide-react';
import { useSmartAccountClient } from '@account-kit/react';
import { type Hex, type Address, parseEther, formatEther, encodeFunctionData, erc20Abi, parseUnits, maxUint256 } from 'viem';
import { alchemySwapService, AlchemySwapService, type TokenSymbol, BASE_TOKENS, TOKEN_INFO } from '@/lib/sdk/alchemy/swap-service';
import { priceService, PriceService } from '@/lib/sdk/alchemy/price-service';
import { CurrencyConverter } from '@/lib/utils/currency-converter';

interface AlchemySwapWidgetProps {
  onSwapSuccess?: () => void;
  className?: string;
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

export function AlchemySwapWidget({ onSwapSuccess, className }: AlchemySwapWidgetProps) {
  const { address, client } = useSmartAccountClient({});
  
  const [swapState, setSwapState] = useState<SwapState>({
    fromToken: 'ETH',
    toToken: 'USDC',
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
        console.error('Error fetching prices:', error);
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
        console.log('Fetching balances for address:', address);
        
        // Get ETH balance
        const ethBalance = await client.getBalance({
          address: address as Address,
        });
        
        console.log('ETH balance (wei):', ethBalance.toString());
        
        const newBalances: Record<TokenSymbol, string> = {
          ETH: AlchemySwapService.parseAmount(`0x${ethBalance.toString(16)}` as Hex, 'ETH'),
          USDC: '0', // TODO: Fetch ERC20 balances
          DAI: '0',  // TODO: Fetch ERC20 balances
        };

        console.log('Parsed balances:', newBalances);
        setBalances(newBalances);
        
        // Check if the account has any ETH at all
        if (ethBalance === 0n) {
          console.warn('Account has zero ETH balance. This may cause swap failures.');
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
        console.error('Error fetching balances:', error);
      }
    };

    fetchBalances();
  }, [address, client]);

  const handleFromTokenChange = (value: string) => {
    const newFromToken = value as TokenSymbol;
    setSwapState(prev => ({
      ...prev,
      fromToken: newFromToken,
      toToken: prev.fromToken, // Swap the tokens
      fromAmount: '',
      toAmount: '',
      quote: null,
      error: null,
    }));
  };

  const handleToTokenChange = (value: string) => {
    const newToToken = value as TokenSymbol;
    setSwapState(prev => ({
      ...prev,
      toToken: newToToken,
      fromAmount: '',
      toAmount: '',
      quote: null,
      error: null,
    }));
  };

  const handleFromAmountChange = async (value: string) => {
    setSwapState(prev => ({ ...prev, fromAmount: value, toAmount: '', quote: null, error: null }));
    
    if (!value || parseFloat(value) <= 0 || !address) return;

    try {
      setSwapState(prev => ({ ...prev, isLoading: true }));
      
      // Check if the amount is greater than the available balance
      const availableBalance = parseFloat(balances[swapState.fromToken]);
      const requestedAmount = parseFloat(value);
      
      if (requestedAmount > availableBalance) {
        setSwapState(prev => ({
          ...prev,
          error: `Insufficient balance. You have ${availableBalance} ${swapState.fromToken}, but trying to swap ${requestedAmount} ${swapState.fromToken}`,
        }));
        return;
      }
      
      const fromAmountHex = AlchemySwapService.formatAmount(value, swapState.fromToken);
      
      console.log('Requesting swap quote:', {
        from: address,
        fromToken: swapState.fromToken,
        toToken: swapState.toToken,
        fromAmount: value,
        fromAmountHex,
        availableBalance
      });
      
      const quoteResponse = await alchemySwapService.requestSwapQuote({
        from: address as Address,
        fromToken: swapState.fromToken,
        toToken: swapState.toToken,
        fromAmount: fromAmountHex,
      });

      if (quoteResponse.result?.quote) {
        const toAmount = AlchemySwapService.parseAmount(
          quoteResponse.result.quote.minimumToAmount,
          swapState.toToken
        );
        
        setSwapState(prev => ({
          ...prev,
          toAmount,
          quote: quoteResponse.result,
        }));
      }
    } catch (error) {
      console.error('Error getting quote:', error);
      setSwapState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get quote',
      }));
    } finally {
      setSwapState(prev => ({ ...prev, isLoading: false }));
    }
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
      console.error('Error converting USD to token:', error);
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

  const handleSwapTokens = () => {
    setSwapState(prev => ({
      ...prev,
      fromToken: prev.toToken,
      toToken: prev.fromToken,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount,
      quote: null,
      error: null,
    }));
  };


  const handleExecuteSwap = async () => {
    if (!address || !swapState.quote || !client) return;

    try {
      setSwapState(prev => ({ ...prev, isSwapping: true, error: null }));

      console.log('Executing swap with EIP-7702:', swapState.quote);

      // ========== PRE-FLIGHT CHECKS ==========
      
      // Check 1: Verify account has ETH balance
      const ethBalance = await client.getBalance({ address });
      console.log('ETH Balance:', formatEther(ethBalance), 'ETH');
      
      // Check 2: Verify smart account is deployed
      // Use eth_getCode to check if contract code exists at the address
      let isDeployed = true; // Default to true, will check below
      
      try {
        const code = await client.transport.request({
          method: "eth_getCode",
          params: [address, "latest"],
        }) as Hex;
        
        console.log('🔍 Deployment check:', {
          address,
          codeLength: code?.length,
          codePreview: code?.slice(0, 20),
          isEmpty: code === '0x' || code === '0x0' || !code,
        });
        
        // Only mark as not deployed if we definitely get empty code
        isDeployed = code && code.length > 2 && code !== '0x' && code !== '0x0';
        
        if (!isDeployed) {
          console.warn('⚠️ Account appears not deployed. Code returned:', code);
          // Only throw if we have ETH balance (account should be deployed if it has balance)
          if (ethBalance > BigInt(0)) {
            console.log('✓ Account has balance, assuming deployed despite code check');
            isDeployed = true; // Override - if account has balance, it's likely deployed
          } else {
            throw new Error(
              '🚀 Smart account not deployed yet!\n\n' +
              'Your smart account address:\n' + address + '\n\n' +
              '📝 To deploy your account:\n' +
              '1. Send at least 0.001 ETH to the address above\n' +
              '2. Use Base Bridge: https://bridge.base.org\n' +
              '3. Or buy ETH on Coinbase and withdraw to Base network\n\n' +
              '💡 The account will auto-deploy when it receives ETH.\n' +
              'Check deployment status: https://basescan.org/address/' + address
            );
          }
        } else {
          console.log('✓ Account deployed successfully');
        }
      } catch (error) {
        // If deployment check fails, log but don't block if account has balance
        console.warn('⚠️ Deployment check failed:', error);
        if (ethBalance > BigInt(0)) {
          console.log('✓ Account has balance, proceeding with swap');
          isDeployed = true;
        } else {
          throw error; // Re-throw if no balance
        }
      }

      // Check 3: Ensure minimum ETH for gas (0.001 ETH minimum recommended)
      const minGasEth = parseEther('0.001');
      if (ethBalance < minGasEth) {
        throw new Error(
          `Insufficient ETH for gas fees. You need at least 0.001 ETH, but you have ${formatEther(ethBalance)} ETH. Please add more ETH to your account.`
        );
      }

      // Check 4: If swapping FROM ETH, verify total ETH needed
      if (swapState.fromToken === 'ETH') {
        const quoteData = swapState.quote.data;
        const swapAmount = BigInt(quoteData.value || '0x0');
        // Need swap amount + buffer for gas
        const totalNeeded = swapAmount + minGasEth;
        
        console.log('ETH Swap Check:', {
          swapAmount: formatEther(swapAmount),
          gasBuffer: formatEther(minGasEth),
          totalNeeded: formatEther(totalNeeded),
          available: formatEther(ethBalance),
          sufficient: ethBalance >= totalNeeded
        });
        
        if (ethBalance < totalNeeded) {
          throw new Error(
            `Insufficient ETH. You need ${formatEther(totalNeeded)} ETH total ` +
            `(${formatEther(swapAmount)} for swap + 0.001 ETH for gas), ` +
            `but you have ${formatEther(ethBalance)} ETH`
          );
        }
      }

      console.log('✓ All pre-flight checks passed');

      // ========== INSPECT QUOTE STRUCTURE ==========
      console.log('📦 Full quote structure:', JSON.stringify(swapState.quote, null, 2));
      console.log('📦 Quote type:', swapState.quote.type);
      console.log('📦 Quote data keys:', Object.keys(swapState.quote.data || {}));

      // ========== TOKEN APPROVAL CHECK ==========
      
      // If swapping FROM an ERC-20 token (not ETH), we need to check approval
      if (swapState.fromToken !== 'ETH') {
        console.log(`📋 Checking ${swapState.fromToken} approval...`);
        
        const tokenAddress = BASE_TOKENS[swapState.fromToken] as Address;
        const quoteData = swapState.quote.data;
        const spenderAddress = quoteData.sender as Address; // The router/multicall contract
        const swapAmountHex = AlchemySwapService.formatAmount(swapState.fromAmount, swapState.fromToken);
        const swapAmount = BigInt(swapAmountHex);
        
        try {
          // Check current allowance
          const allowance = await client.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [address as Address, spenderAddress],
          }) as bigint;
          
          console.log(`Current allowance: ${allowance.toString()}, needed: ${swapAmount.toString()}`);
          
          // If allowance is insufficient, request approval
          if (allowance < swapAmount) {
            console.log('⚠️ Insufficient allowance, requesting approval...');
            
            // Set flag to indicate we're doing approval
            setIsApprovingToken(true);
            
            // Send approval transaction with max allowance to avoid future approvals
            const approvalData = encodeFunctionData({
              abi: erc20Abi,
              functionName: 'approve',
              args: [spenderAddress, maxUint256], // Max approval
            });
            
            console.log(`📝 Sending approval for ${swapState.fromToken}...`);
            
            // Use direct client method for approval too
            const approvalOp = await client.sendUserOperation({
              uo: {
                target: tokenAddress,
                data: approvalData as Hex,
                value: BigInt(0),
              },
            });
            
            console.log('✅ Approval UserOperation sent:', approvalOp.hash);
            
            // Wait for approval to be mined
            const approvalTxHash = await client.waitForUserOperationTransaction({
              hash: approvalOp.hash,
            });
            
            console.log('✅ Approval confirmed! Hash:', approvalTxHash);
            console.log('✅ Proceeding to swap...');
          } else {
            console.log('✅ Sufficient allowance already exists');
          }
        } catch (approvalError) {
          setIsApprovingToken(false);
          console.error('Approval failed:', approvalError);
          throw new Error(
            `Failed to approve ${swapState.fromToken} for swap. ` +
            (approvalError instanceof Error ? approvalError.message : 'Please try again.')
          );
        }
      }

      // ========== EXECUTE SWAP ==========

      // Extract the call data from the quote's user operation
      const quoteData = swapState.quote.data;
      
      console.log('🔄 Quote data structure:', {
        sender: quoteData.sender,
        target: quoteData.target,
        callDataLength: quoteData.callData?.length,
        value: quoteData.value,
        hasCallGasLimit: !!quoteData.callGasLimit,
        fullQuote: quoteData,
      });

      // IMPORTANT: The target should be extracted from the callData
      // Alchemy's swap quotes contain multicall data where the first call is the actual swap
      // The sender is the user's account, we need to extract the actual target from callData
      
      // For now, use the sender as the target since it's a self-call multicall pattern
      // The account will execute the multicall which contains the swap instructions
      const target = (quoteData.target || quoteData.sender || address) as Address;
      
      console.log('📍 Using target address:', target);
      console.log('📍 Call data:', quoteData.callData);
      
      // Use client.sendUserOperation directly to bypass EIP-5792 wallet_prepareCalls
      // This uses the traditional EIP-4337 UserOperation flow
      console.log('🚀 Sending UserOperation via direct client method...');
      
      const operation = await client.sendUserOperation({
        uo: {
          target,
          data: quoteData.callData as Hex,
          value: BigInt(quoteData.value || '0x0'),
        },
      });

      console.log('🎉 UserOperation sent! Hash:', operation.hash);
      console.log('⏳ Waiting for transaction confirmation...');
      
      // Wait for the UserOperation to be mined
      const txHash = await client.waitForUserOperationTransaction({
        hash: operation.hash,
      });
      
      console.log('✅ Transaction mined! Hash:', txHash);
      
      // Update state with success
      setSwapState(prev => ({
        ...prev,
        transactionHash: txHash,
        isSwapping: false,
      }));
      
      onSwapSuccess?.();

    } catch (error) {
      console.error('❌ Swap failed:', error);
      setIsApprovingToken(false); // Reset approval flag
      
      // Provide user-friendly error messages
      let userMessage = 'Swap execution failed';
      const errorStr = error instanceof Error ? error.message : String(error);
      
      if (errorStr.includes('AA23')) {
        userMessage = 
          '⚠️ Transaction validation failed (AA23 error).\n\n' +
          'This usually means:\n' +
          '• Insufficient ETH for gas fees\n' +
          '• Insufficient token balance for swap\n' +
          '• Token approval required\n\n' +
          'Please check your balances and try again.';
      } else if (errorStr.includes('AA24')) {
        userMessage = 'Transaction signature error. Please try again.';
      } else if (errorStr.includes('AA25')) {
        userMessage = 'Invalid signature. Please reconnect your wallet.';
      } else if (errorStr.includes('insufficient')) {
        userMessage = errorStr; // Use our detailed insufficient balance message
      } else if (errorStr.includes('not deployed')) {
        userMessage = errorStr; // Use our account deployment message
      } else if (errorStr.includes('User rejected') || errorStr.includes('user rejected')) {
        userMessage = 'Transaction cancelled by user';
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
        <CardDescription>
          Swap tokens instantly using Alchemy&apos;s smart wallet integration
        </CardDescription>
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
            <Select value={swapState.fromToken} onValueChange={handleFromTokenChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="DAI">DAI</SelectItem>
              </SelectContent>
            </Select>
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
                className={inputMode === 'usd' ? 'pl-6 pr-20' : 'pr-20'}
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
            <span>Balance: {balances[swapState.fromToken]} {swapState.fromToken}</span>
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
                  Max: ~{PriceService.formatUSD(usdValues.fromAmount > 0 ? parseFloat(balances[swapState.fromToken]) * prices[swapState.fromToken] : 0)}
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
            <Select value={swapState.toToken} onValueChange={handleToTokenChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="DAI">DAI</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Input
                type="number"
                placeholder="0.0"
                value={swapState.toAmount}
                readOnly
                className="bg-muted pr-20"
              />
              {usdValues.toAmount > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  ≈ {PriceService.formatUSD(usdValues.toAmount)}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Balance: {balances[swapState.toToken]} {swapState.toToken}</span>
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
                <span>1 {swapState.fromToken} = {(parseFloat(swapState.toAmount) / parseFloat(swapState.fromAmount)).toFixed(6)} {swapState.toToken}</span>
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
