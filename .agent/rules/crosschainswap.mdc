---
title: Cross-chain swaps (Alpha)
slug: wallets/transactions/cross-chain-swap-tokens
---

Cross-chain swaps let you convert tokens across different blockchain networks in a single transaction. They're built natively into Smart Wallets and you can integrate in minutes.

Cross-chain swaps work just like any other Smart Wallet transaction, so you can sponsor gas to do gasless swaps, or pay for gas in an ERC-20 token.

<Tip>
  Cross-chain swaps are in alpha. Note that there may be changes in the future
  to simplify the endpoint/sdk. We will let you know if/when that happens.
</Tip>

# The Cross-chain Swap flow

## **Flow**

1. Request a cross-chain swap quote
2. Sign the prepared swap calls
3. Send prepared calls
4. Wait for cross-chain confirmation

## **Swap options**

<Info>
  **Important**: Cross-chain swaps do not support `postCalls`. You cannot batch
  additional actions after a cross-chain swap completes (for now).
</Info>

When requesting a cross-chain swap quote, you can specify either a `fromAmount` , or a `minimumToAmount`.

```tsx
// Mode 1: Swap exact input amount
{
  fromAmount: "0x2710";
} // Swap exactly 0.01 USDC (10000 in hex, 6 decimals)

// Mode 2: Get minimum output amount
{
  minimumToAmount: "0x5AF3107A4000";
} // Get at least 0.0001 ETH (18 decimals). The amount you need to spend is calculated to get at least your desired ETH amount.
```

## Prerequisites

Before you begin, ensure you have:

- An [Alchemy API Key](https://dashboard.alchemy.com/apps)
- If you're sponsoring gas, then a [Gas Manager](https://dashboard.alchemy.com/gas-manager/policy/create) policy
- A small amount of tokens for testing (~$1 worth is enough!)
  - **Important**: You'll need to send these tokens to your smart wallet address to be able to swap!
- A signer to own the account and sign messages

<Info>
  Note that Cross-chain Swaps are currently supported via direct APIs and the
  SDK. React support coming soon!
</Info>

<Tabs>
  <Tab title="React">
    <Info>Required SDK version: ^v4.70.0</Info>
    
    <Info>
      **Important**: Cross-chain swaps do not support `postCalls`. You cannot batch
      additional actions after a cross-chain swap completes.
    </Info>
    
    Use the `usePrepareSwap` hook with the `toChainId` parameter to request cross-chain swap quotes and the `useSignAndSendPreparedCalls` hook to execute token swaps across different chains.
    
    **Prerequisites**
    
    - [Smart Wallets installed and configured in your project](/wallets/react/quickstart)
    - An [authenticated user](/wallets/authentication/overview)
    - Tokens in your smart account to swap
    
    <CodeBlocks>
    
    ```tsx title="crossChainSwap.tsx"
    import {
      useSmartAccountClient,
      usePrepareSwap,
      useSignAndSendPreparedCalls,
      useWaitForCallsStatus,
      useUser,
    } from "@account-kit/react";
    
    // Chain IDs
    const CHAIN_IDS = {
      ARBITRUM: "0xa4b1",
      BASE: "0x2105",
    } as const;
    
    // Token addresses
    const TOKENS = {
      NATIVE: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEee", // ETH
      BASE_USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    } as const;
    
    export default function CrossChainSwap() {
      const user = useUser();
      const { client } = useSmartAccountClient({
        accountParams: { mode: "7702" },
      });
    
      const { prepareSwapAsync, isPreparingSwap } = usePrepareSwap({
        client,
      });
    
      const {
        signAndSendPreparedCallsAsync,
        isSigningAndSendingPreparedCalls,
        signAndSendPreparedCallsResult,
      } = useSignAndSendPreparedCalls({ client });
    
      const {
        data: statusResult,
        isLoading: isWaitingForConfirmation,
        error,
      } = useWaitForCallsStatus({
        client,
        id: signAndSendPreparedCallsResult?.preparedCallIds[0],
      });
    
      const handleCrossChainSwap = async () => {
        if (!client?.account.address) {
          throw new Error("No account connected");
        }
    
        try {
          // Step 1: Request cross-chain swap quote
          const result = await prepareSwapAsync({
            from: client.account.address,
            fromToken: TOKENS.NATIVE,
            toChainId: CHAIN_IDS.BASE, // Destination chain
            toToken: TOKENS.BASE_USDC,
            fromAmount: "0x5af3107a4000", // 0.0001 ETH
          });
    
          const { quote, ...calls } = result;
          console.log("Cross-chain swap quote:", quote);
    
          // Ensure we have prepared calls
          if (calls.rawCalls) {
            throw new Error("Expected prepared calls");
          }
    
          // Step 2: Sign and send the prepared calls
          const callIds = await signAndSendPreparedCallsAsync(calls);
    
          console.log("Cross-chain swap initiated");
          console.log("Call ID:", callIds?.preparedCallIds[0]);
        } catch (error) {
          console.error("Cross-chain swap failed:", error);
        }
      };
    
      if (!user) {
        return <div>Please log in to use swap functionality</div>;
      }
    
      return (
        <div>
          <button onClick={handleCrossChainSwap} disabled={!client}>
            {isPreparingSwap
              ? "Requesting quote..."
              : isSigningAndSendingPreparedCalls
                ? "Signing and sending..."
                : "Swap ETH Arbitrum → Base USDC"}
          </button>
    
          {signAndSendPreparedCallsResult && (
            <p>
              {isWaitingForConfirmation
                ? "Waiting for cross-chain confirmation..."
                : error
                  ? `Error: ${error}`
                  : statusResult?.statusCode === 200
                    ? "Cross-chain swap confirmed!"
                    : `Status: ${statusResult?.statusCode}`}
            </p>
          )}
        </div>
      );
    }
    ```
    
    </CodeBlocks>
    
    ## How it works
    
    1. **Request quote**: `usePrepareSwap` requests a cross-chain swap quote with the `toChainId` parameter
    2. **Destructure result**: Extract `quote` for display and `calls` for signing
    3. **Sign and send**: `useSignAndSendPreparedCalls` signs and submits the transaction (callId automatically preserved)
    4. **Track status**: `useWaitForCallsStatus` monitors the transaction with cross-chain status codes
    
    Cross-chain swaps take longer than single-chain swaps due to cross-chain messaging and confirmation requirements.
    
    ## Cross-chain status codes
    
    Cross-chain swaps have additional status codes to reflect the cross-chain nature:
    
    | Code    | Status                      |
    | ------- | --------------------------- |
    | 100     | Pending                     |
    | **120** | **Cross-Chain In Progress** |
    | 200     | Confirmed                   |
    | 400     | Offchain Failure            |
    | **410** | **Cross-chain Refund**      |
    | 500     | Onchain Failure             |
    | 600     | Partial Onchain Failure     |
    
    ## Swap options
    
    You can specify either an exact input amount or a minimum output amount:
    
    ```tsx
    // Mode 1: Swap exact input amount
    await prepareSwapAsync({
      from: address,
      toChainId: "0x2105", // Base
      fromToken: "0x...",
      toToken: "0x...",
      fromAmount: "0x2710", // Swap exactly 0.01 USDC
    });
    
    // Mode 2: Get minimum output amount
    await prepareSwapAsync({
      from: address,
      toChainId: "0x2105", // Base
      fromToken: "0x...",
      toToken: "0x...",
      minimumToAmount: "0x5AF3107A4000", // Get at least 0.0001 ETH
    });
    ```
    
  </Tab>
  <Tab title="JavaScript">
    <Info>Required SDK version: ^v4.70.0</Info>
    
    <Info>
      **Important**: Cross-chain swaps do not support `postCalls`. You cannot batch
      additional actions after a cross-chain swap completes.
    </Info>
    
    You'll need the following env variables:
    
    - `ALCHEMY_API_KEY`: An [Alchemy API Key](https://dashboard.alchemy.com/apps)
    - `ALCHEMY_POLICY_ID`: A [Gas Manager](https://dashboard.alchemy.com/gas-manager/policy/create) policy ID
    - `PRIVATE_KEY`: A private key for a signer
    
    <CodeBlocks>
    
    ```ts title="requestCrossChainQuote.ts"
    import { swapActions } from "@account-kit/wallet-client/experimental";
    import { client } from "./client";
    
    const account = await client.requestAccount();
    
    // Add the swap actions to the client
    const swapClient = client.extend(swapActions);
    
    // Request the cross-chain swap quote
    // Note: toChainId specifies the destination chain for the swap
    const { quote, callId, ...calls } = await swapClient.requestQuoteV0({
      from: account.address,
      toChainId: "0x...", // Destination chain ID
      fromToken: "0x...",
      toToken: "0x...",
      minimumToAmount: "0x...",
    });
    
    // Display the swap quote, including the minimum amount to receive and the expiry
    console.log(quote);
    console.log(`Cross-chain swap callId: ${callId}`);
    
    // Assert that the calls are not raw calls.
    // This will always be the case when requestQuoteV0 is used without the `returnRawCalls` option,
    // the assertion is just needed for Typescript to recognize the result type.
    if (calls.rawCalls) {
      throw new Error("Expected user operation calls");
    }
    
    // Sign the quote, getting back prepared and signed calls
    // The callId is automatically included in the signed calls
    const signedCalls = await swapClient.signPreparedCalls(calls);
    
    // Send the prepared calls
    // The callId is passed through automatically
    const { preparedCallIds } = await swapClient.sendPreparedCalls(signedCalls);
    
    // Wait for the call to resolve
    // Cross-chain swaps may take longer due to cross-chain messaging
    const callStatusResult = await swapClient.waitForCallsStatus({
      id: preparedCallIds[0]!,
    });
    
    // Filter through success or failure cases
    // Cross-chain swaps have additional status codes:
    // - 120: Cross-Chain In Progress
    // - 410: Cross-chain Refund
    if (
      callStatusResult.status !== "success" ||
      !callStatusResult.receipts ||
      !callStatusResult.receipts[0]
    ) {
      throw new Error(
        `Cross-chain swap failed with status ${callStatusResult.status}, full receipt:\n ${JSON.stringify(callStatusResult, null, 2)}`,
      );
    }
    
    console.log("Cross-chain swap confirmed!");
    console.log(
      `Transaction hash: ${callStatusResult.receipts[0].transactionHash}`,
    );
    ```
    
    ```ts title="client.ts"
    import "dotenv/config";
    import type { Hex } from "viem";
    import { LocalAccountSigner } from "@aa-sdk/core";
    import { alchemy, sepolia } from "@account-kit/infra";
    import { createSmartWalletClient } from "@account-kit/wallet-client";
    
    const clientParams = {
      transport: alchemy({
        apiKey: process.env.ALCHEMY_API_KEY!,
      }),
      chain: sepolia,
      signer: LocalAccountSigner.privateKeyToAccountSigner(
        process.env.PRIVATE_KEY! as Hex,
      ),
      policyId: process.env.ALCHEMY_POLICY_ID!, // Optional: If you're using a gas manager policy
    };
    
    const clientWithoutAccount = createSmartWalletClient(clientParams);
    
    const account = await clientWithoutAccount.requestAccount();
    
    export const client = createSmartWalletClient({
      ...clientParams,
      account: account.address,
    });
    ```
    
    </CodeBlocks>
    
  </Tab>
  <Tab title="APIs">
    You will need to fill in values wrapped in curly braces like `{SIGNER_ADDRESS}`.
    
    <Steps>
    
    <Step title="Request an account">
    
    ```bash
    curl -X POST https://api.g.alchemy.com/v2/{API_KEY} \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "wallet_requestAccount",
        "params": [
          {
            "signerAddress": "{SIGNER_ADDRESS}"
          }
        ]
      }'
    ```
    
    This returns:
    
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": {
        "accountAddress": "ACCOUNT_ADDRESS",
        "id": "ACCOUNT_ID"
      }
    }
    ```
    
    For other potential responses, [check out the API reference!](/docs/wallets/api-reference/smart-wallets/wallet-api-endpoints/wallet-api-endpoints/wallet-request-account)
    
    </Step>
    
    <Step title="Request a cross-chain swap quote">
    
    <Info>
      **Important**: Cross-chain swaps do not support `postCalls`. You cannot batch
      additional actions after a cross-chain swap.
    </Info>
    
    Request a cross-chain swap quote by specifying both the source chain (`chainId`) and destination chain (`toChainId`). In addition, just like in [single-chain swaps](/wallets/transactions/swap-tokens) you can specify either a `minimumToAmount` or a `fromAmount`.
    
    <Info>
      If you're using an EOA or just want the raw array of calls returned, pass the
      optional parameter `"returnRawCalls": true`, this will return a `calls` array.
    </Info>
    
    ```bash
    curl -X POST https://api.g.alchemy.com/v2/{API_KEY} \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "wallet_requestQuote_v0",
        "params": [
          {
            "from": "{ACCOUNT_ADDRESS_FROM_STEP_1}",
            "chainId": "{SOURCE_CHAIN_ID}",
            "toChainId": "{DESTINATION_CHAIN_ID}",
            "fromToken": "{FROM_TOKEN}",
            "toToken": "{TO_TOKEN}",
            "fromAmount": "{FROM_AMOUNT_HEXADECIMAL}",
            "capabilities": {
              "paymasterService": {
                "policyId": "{PAYMASTER_POLICY_ID}"
              }
            }
          }
        ]
      }'
    ```
    
    This returns:
    
    ```json
    {
      "jsonrpc": "2.0",
      "id": 0,
      "result": {
        "rawCalls": false,
        "chainId": "...",
        "callId": "0x...",
        "quote": {
          "expiry": "EXPIRY",
          "minimumToAmount": "MINIMUM_TO_AMOUNT",
          "fromAmount": "FROM_AMOUNT"
        },
        "type": "user-operation-v070",
        "data": "USER_OPERATION_DATA",
        "signatureRequest": {
          "type": "personal_sign",
          "data": {
            "raw": "..."
          },
          "rawPayload": "..."
        },
        "feePayment": {
          "sponsored": true,
          "tokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          "maxAmount": "..."
        }
      }
    }
    ```
    
    Note the `callId` in the response! You'll use this to track the cross-chain swap status. Also note the `signatureRequest` - this is what you need to sign, and the returned `data` field is what you'll need to send the transaction.
    
    </Step>
    
    <Step title="Sign the signature request">
    
    To sign the signature request, sign the `raw` field (note, this is not a string! You need to pass it to your signer as raw bytes, generally like so: `{ raw: "0x..." }`) with your signer of choice.
    
    This should use the `personal_sign` RPC method, as noted by the `type` in the `signatureRequest`.
    
    Alternatively, you can sign the raw payload with a simple `eth_sign` but this RPC method is not favored due to security concerns.
    
    </Step>
    
    <Step title="Send the prepared call">
    
    Pass the `callId` from Step 2 to `sendPreparedCalls`. This makes the response return the same `callId` with additional cross-chain status tracking information:
    
    ```bash
    curl -X POST https://api.g.alchemy.com/v2/{API_KEY} \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc": "2.0",
        "method": "wallet_sendPreparedCalls",
        "params": [
          {
            "callId": "{CALL_ID_FROM_STEP_2}",
            "type": "user-operation-v070",
            "data": "{DATA_FROM_STEP_2}",
            "chainId": "{SOURCE_CHAIN_ID}",
            "signature": {
              "type": "secp256k1",
              "data": "{SIGNATURE_FROM_STEP_3}"
            }
          }
        ],
        "id": 1
      }'
    ```
    
    This returns:
    
    ```json
    {
      "jsonrpc": "2.0",
      "id": "1",
      "result": {
        "preparedCallIds": ["PREPARED_CALL_ID"]
      }
    }
    ```
    
    The response returns the same `callId` you passed in, which you'll use to track the cross-chain swap status in the next step.
    
    For other potential responses, [check out the API reference!](/docs/wallets/api-reference/smart-wallets/wallet-api-endpoints/wallet-api-endpoints/wallet-send-prepared-calls)
    
    </Step>
    
    <Step title="Track the cross-chain swap">
    
    Use the `wallet_getCallsStatus` endpoint to check the status of your cross-chain swap. Cross-chain swaps may take longer than single-chain swaps due to cross-chain messaging.
    
    ```bash
    curl -X POST https://api.g.alchemy.com/v2/{API_KEY} \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc": "2.0",
        "method": "wallet_getCallsStatus",
        "params": [
          [
            "{CALL_ID_FROM_STEP_2_OR_STEP_4}"
          ]
        ],
        "id": 1
      }'
    ```
    
    This returns:
    
    ```json
    {
      "id": "1",
      "jsonrpc": "2.0",
      "result": {
        "id": "CALL_ID",
        "chainId": "SOURCE_CHAIN_ID",
        "atomic": true,
        "status": 200,
        "receipts": [...]
      }
    }
    ```
    
    Cross-chain swaps have additional status codes to reflect the cross-chain nature of the transaction:
    
    | Code | Title                   |
    | ---- | ----------------------- |
    | 100  | Pending                 |
    | 120  | Cross-Chain In Progress |
    | 200  | Confirmed               |
    | 400  | Offchain Failure        |
    | 410  | Cross-chain Refund      |
    | 500  | Onchain Failure         |
    | 600  | Partial Onchain Failure |
    
    To get your transaction hash, you can access `result.receipts[0].transactionHash`.
    
    For more details, check out [the API reference!](/docs/wallets/api-reference/smart-wallets/wallet-api-endpoints/wallet-api-endpoints/wallet-get-calls-status)
    
    </Step>
    
    </Steps>
    
  </Tab>
</Tabs>

# FAQs

## What chains are supported for cross-chain swaps?

Chains supported (for now) are: Arbitrum, Arbitrum Nova, Base, Berachain, Boba Network, BSC/BNB, Celo, Ethereum, Hyperliquid, Ink, Optimism, Plasma, Polygon, Shape, Soneium, Story, Unichain, World Chain, and Zora mainnets.

## Can I batch additional calls after a cross-chain swap?

No, `postCalls` are not supported for cross-chain swaps (for now). You can only perform the swap itself across chains.

## How long do cross-chain swaps take?

Cross-chain swaps typically take longer than single-chain swaps due to the need for cross-chain messaging and confirmation. The exact time depends on the source and destination chains involved in the swap.

## How do you encode values?

Values are simply passed as hexadecimal strings. The Swap API doesn't add complexity to consider decimals, so 0x01 is always the smallest amount of a given asset.
1 ETH, or DAI (18 decimals) is `0xDE0B6B3A7640000`
1 USDC (6 decimals) is `0xF4240`
This removes any ambiguity— if it's numerical, it's a hex.

## What is the expiry?

The expiry is an informational indicator of when you can expect to be able to process the swap request. If you're at/near the expiry, it might be a good time to request a new quote.

## What are the different status codes for cross-chain swaps?

Cross-chain swaps may have additional status codes beyond standard transaction statuses to reflect the cross-chain nature of the transaction. These are:

- 120: Cross-chain in progress
- 410: Cross-chain refund

## When is a CallId returned from `wallet_requestQuote_v0`?

Any time you’re requesting a cross-chain quote via `wallet_requestQuote_v0` , a `callId` is returned. This `callId` includes important data for cross-chain tracking. You can use this just like any other `callId` in `wallet_getCallsStatus`!
