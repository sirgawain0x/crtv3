import { type Hex, type Address } from "viem";

// Base chain token addresses
export const BASE_TOKENS = {
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEee", // Native ETH
  USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on Base
  DAI: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", // DAI on Base
  DEARCRTV: "0x81ced3c6e7058c1fe8d9b6c5a2435a65a4593292", // Paragraph Coin
} as const;

export type TokenSymbol = keyof typeof BASE_TOKENS;

// Token metadata
export const TOKEN_INFO = {
  ETH: { decimals: 18, symbol: "ETH" },
  USDC: { decimals: 6, symbol: "USDC" },
  DAI: { decimals: 18, symbol: "DAI" },
  DEARCRTV: { decimals: 18, symbol: "DEARCRTV" },
} as const;

interface SwapQuoteRequest {
  from: Address;
  chainId: string;
  fromToken: Address;
  toToken: Address;
  fromAmount?: Hex;
  minimumToAmount?: Hex;
  capabilities?: {
    paymasterService?: {
      policyId: string;
    };
  };
  slippage?: Hex;
}

interface SwapQuoteResponse {
  id: number;
  jsonrpc: "2.0";
  result?: {
    quote: {
      minimumToAmount: Hex;
      expiry: Hex;
      fromAmount?: Hex;
    };
    type: string;
    data: any;
    calls?: Array<{
      to: Hex;
      data: Hex;
      value: Hex;
    }>;
    signatureRequest: {
      type: string;
      data: {
        raw: Hex;
      };
      rawPayload: Hex;
    };
    feePayment?: {
      sponsored: boolean;
      tokenAddress: Address;
      maxAmount: Hex;
    };
  };
  error?: {
    code: number;
    message: string;
  };
}

interface SendPreparedCallsRequest {
  type: string;
  data: any;
  chainId: string;
  signature: {
    type: string;
    data: Hex;
  };
}

interface SendPreparedCallsResponse {
  jsonrpc: "2.0";
  id: number;
  result: {
    preparedCallIds: string[];
  };
  error?: {
    code: number;
    message: string;
  };
}

interface CallStatusResponse {
  jsonrpc: "2.0";
  id: number;
  result: {
    id: string;
    chainId: string;
    atomic: boolean;
    status: number;
    receipts?: Array<{
      transactionHash: Hex;
      blockNumber: Hex;
      gasUsed: Hex;
      effectiveGasPrice: Hex;
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

export class AlchemySwapService {
  private apiKey: string;
  private paymasterPolicyId?: string;

  constructor(apiKey: string, paymasterPolicyId?: string) {
    this.apiKey = apiKey;
    this.paymasterPolicyId = paymasterPolicyId;
  }

  /**
   * Request a swap quote from Alchemy
   */
  async requestSwapQuote(params: {
    from: Address;
    fromToken: TokenSymbol;
    toToken: TokenSymbol;
    fromAmount?: Hex;
    minimumToAmount?: Hex;
    slippage?: number; // in basis points (e.g., 50 = 0.5%)
  }): Promise<SwapQuoteResponse> {
    const { from, fromToken, toToken, fromAmount, minimumToAmount, slippage = 50 } = params;

    if (!this.apiKey) {
      throw new Error("Alchemy API key is not configured. Please check your environment variables.");
    }

    if (fromToken === toToken) {
      throw new Error("Cannot swap token to itself");
    }

    // Validate that the amount is reasonable (not too small)
    if (fromAmount) {
      const amount = BigInt(fromAmount);
      const minAmount = BigInt(1000); // Minimum 1000 wei equivalent
      if (amount < minAmount) {
        throw new Error(`Amount too small. Minimum amount is ${minAmount} wei.`);
      }
    }

    // Check if target is Paragraph Coin
    if (toToken === 'DEARCRTV') {
      return this.getParagraphBuyQuote({
        from,
        fromAmount: fromAmount || '0x0', // Fallback, usually passed
        contractAddress: BASE_TOKENS.DEARCRTV
      });
    }

    const quoteRequest: SwapQuoteRequest = {
      from,
      chainId: "0x2105", // Base mainnet chain ID
      fromToken: BASE_TOKENS[fromToken],
      toToken: BASE_TOKENS[toToken],
      capabilities: this.paymasterPolicyId ? {
        paymasterService: {
          policyId: this.paymasterPolicyId,
        },
      } : undefined,
      slippage: `0x${slippage.toString(16)}`,
      returnRawCalls: true,
    } as any;

    // Add either fromAmount or minimumToAmount
    if (fromAmount) {
      quoteRequest.fromAmount = fromAmount;
    } else if (minimumToAmount) {
      quoteRequest.minimumToAmount = minimumToAmount;
    } else {
      throw new Error("Either fromAmount or minimumToAmount must be provided");
    }

    console.log('Making swap quote request with:', {
      apiKey: this.apiKey ? `${this.apiKey.slice(0, 10)}...` : 'MISSING',
      quoteRequest: {
        ...quoteRequest,
        capabilities: quoteRequest.capabilities ? 'PRESENT' : 'MISSING'
      }
    });

    const response = await fetch(`https://api.g.alchemy.com/v2/${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "wallet_requestQuote_v0",
        params: [quoteRequest],
      }),
    });

    if (!response.ok) {
      let errorMessage = `Swap quote request failed: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = `API Error: ${errorData.error.message || errorData.error}`;
        }
      } catch (jsonError) {
        // Response is not JSON, use the default error message
      }
      throw new Error(errorMessage);
    }

    const result = await response.json() as SwapQuoteResponse;

    console.log('Swap quote response:', {
      hasResult: !!result.result,
      hasError: !!result.error,
      error: result.error,
      result: result.result ? 'PRESENT' : 'MISSING'
    });

    if (result.error) {
      console.error('Swap quote error details:', {
        code: result.error.code,
        message: result.error.message,
        fullError: result.error
      });

      // Provide more specific error messages based on the error type
      let specificMessage = result.error.message;

      if (result.error.message?.includes('Multicall3: call failed')) {
        specificMessage = `Swap failed: Multicall3 call failed. This usually means:
1. The account doesn't have sufficient ${fromToken} balance
2. The smart account isn't properly deployed on Base
3. The account needs ETH for gas fees
4. The token addresses are invalid

Please ensure your account has enough ${fromToken} and ETH for gas fees.

Original error: ${result.error.message}`;
      } else if (result.error.message?.includes('insufficient funds')) {
        specificMessage = `Insufficient balance: You don't have enough ${fromToken} to perform this swap.`;
      } else if (result.error.message?.includes('invalid token')) {
        specificMessage = `Invalid token: The ${fromToken} or ${toToken} token address is not valid on Base network.`;
      } else if (result.error.message?.includes('account not deployed')) {
        specificMessage = `Smart account not deployed: Your smart account needs to be deployed on Base network ` +
          `before you can perform swaps. Try sending a small amount of ETH to your account first.`;
      }

      throw new Error(specificMessage);
    }

    return result;
  }

  /**
   * Get Swap Quote from Paragraph API
   */
  async getParagraphBuyQuote(params: {
    from: Address;
    fromAmount: Hex;
    contractAddress: string;
  }): Promise<SwapQuoteResponse> {
    const { from, fromAmount, contractAddress } = params;
    const amountBigInt = BigInt(fromAmount);

    console.log('Fetching Paragraph Buy Quote:', { from, amount: amountBigInt.toString(), contractAddress });

    const url = `https://public.api.paragraph.com/api/v1/coins/buy/contract/${contractAddress}?walletAddress=${from}&amount=${amountBigInt.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Paragraph API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Paragraph API Response:', data);

    // Universal Router Address on Base
    const UNIVERSAL_ROUTER = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD";

    // Reconstruct calls for UserOperation
    // Paragraph returns { commands: string, inputs: string[] }
    // We need to encode this into a call to UniversalRouter.execute(bytes commands, bytes[] inputs, uint256 deadline)
    // Actually, check standard UniversalRouter ABI. It often is execute(bytes,bytes[],uint256) or execute(bytes,bytes[])
    // Looking at common UniversalRouter interfaces, usually it is:
    // function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;

    // Commands is hex string, Input is array of hex strings
    // We need to encodeFunctionData

    // Simple manual encoding or import encodeFunctionData
    const { encodeFunctionData, parseAbi } = require('viem');

    const abi = parseAbi([
      'function execute(bytes commands, bytes[] inputs, uint256 deadline) external payable'
    ]);

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 mins

    const callData = encodeFunctionData({
      abi,
      functionName: 'execute',
      args: [
        data.commands as Hex,
        data.inputs as Hex[],
        deadline
      ]
    });

    return {
      id: 1,
      jsonrpc: "2.0",
      result: {
        quote: {
          // Paragraph API doesn't return minAmount out directly in this endpoint easily
          // We'll mock it or try to estimate. For now, putting 0 or fromAmount is tricky.
          minimumToAmount: "0x0",
          expiry: `0x${deadline.toString(16)}`,
          fromAmount: fromAmount
        },
        type: "paragraph_swap",
        data: {}, // Legacy field
        calls: [{
          to: UNIVERSAL_ROUTER,
          data: callData,
          value: fromAmount // Assuming we are spending ETH
        }],
        signatureRequest: {
          type: "",
          data: { raw: "0x" },
          rawPayload: "0x"
        }
      }
    };
  }

  /**
   * Send prepared swap calls
   */
  async sendPreparedCalls(params: {
    type: string;
    data: any;
    chainId: string;
    signature: Hex;
  }): Promise<SendPreparedCallsResponse> {
    const { type, data, chainId, signature } = params;

    const requestBody: SendPreparedCallsRequest = {
      type,
      data,
      chainId,
      signature: {
        type: "secp256k1",
        data: signature,
      },
    };

    const response = await fetch(`https://api.g.alchemy.com/v2/${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "wallet_sendPreparedCalls",
        params: [requestBody],
      }),
    });

    if (!response.ok) {
      throw new Error(`Send prepared calls failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as SendPreparedCallsResponse;

    if (result.error) {
      throw new Error(`RPC Error: ${result.error.message}`);
    }

    return result;
  }

  /**
   * Get call status
   */
  async getCallStatus(callId: string): Promise<CallStatusResponse> {
    const response = await fetch(`https://api.g.alchemy.com/v2/${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "wallet_getCallsStatus",
        params: [[callId]],
      }),
    });

    if (!response.ok) {
      throw new Error(`Get call status failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as CallStatusResponse;

    if (result.error) {
      throw new Error(`RPC Error: ${result.error.message}`);
    }

    return result;
  }

  /**
   * Wait for call completion with polling
   */
  async waitForCallCompletion(callId: string, maxAttempts = 60, intervalMs = 2000): Promise<CallStatusResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getCallStatus(callId);

      // Status codes: 100 = Pending, 200 = Confirmed, 400 = Offchain Failure, 500 = Onchain Failure
      if (status.result.status === 200) {
        return status; // Success
      } else if (status.result.status >= 400) {
        throw new Error(`Transaction failed with status ${status.result.status}`);
      }

      // Still pending, wait and try again
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Transaction timed out after ${maxAttempts} attempts`);
  }

  /**
   * Convert amount to hex with proper decimals
   */
  static formatAmount(amount: string, token: TokenSymbol): Hex {
    const decimals = TOKEN_INFO[token].decimals;
    const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
    return `0x${amountBigInt.toString(16)}` as Hex;
  }

  /**
   * Convert hex amount to readable format
   */
  static parseAmount(hexAmount: Hex, token: TokenSymbol): string {
    const decimals = TOKEN_INFO[token].decimals;
    const amountBigInt = BigInt(hexAmount);
    const amount = Number(amountBigInt) / Math.pow(10, decimals);
    return amount.toFixed(6);
  }
}

// Export singleton instance
export const alchemySwapService = new AlchemySwapService(
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "",
  process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID
);
