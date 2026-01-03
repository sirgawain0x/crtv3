---
trigger: always_on
---

Swaps let you convert any token to any other token onchain. They're built natively into Smart Wallets and you can integrate in minutes.

Smart Wallets also allow you to add actions after the swap completes. For example, you can deposit your newly swapped tokens into a DeFi protocol.

Swaps work just like any other Smart Wallet transaction, so you can sponsor gas to do gasless swaps, or pay for gas in an ERC-20 token.

[Cross-chain swaps are live! Send your first cross-chain swap now!](/docs/wallets/transactions/cross-chain-swap-tokens)

<Tip>
  Swaps are in alpha. Note that there may be changes in the future to simplify
  the endpoint/sdk. We will let you know if/when that happens.
</Tip>

# The Swap flow

## **Flow**

1. Request a swap quote
2. Sign the prepared swap calls (including any post swap action)
3. Send prepared calls
4. Wait for onchain confirmation

## **Swap options**

When requesting a swap quote, you can specify either an amount in, or a minimum amount out.

```tsx
// Mode 1: Swap exact input amount
{
  fromAmount: "0x2710";
} // Swap exactly 0.01 USDC (10000 in hex, 6 decimals)

// Mode 2: Get minimum output amount
{
  minimumToAmount: "0x5AF3107A4000";
} // Get at least 0.0001 ETH (18 decimals). We calculate how much USDC you need to spend to get at least your desired ETH amount.
```

## Prerequisites

Before you begin, ensure you have:

- An [Alchemy API Key](https://dashboard.alchemy.com/apps)
- If you're sponsoring gas, then a [Gas Manager](https://dashboard.alchemy.com/gas-manager/policy/create) policy
- A small amount of USDC for testing (~$1 worth is enough!)
  - **Important**: You'll need to send these tokens to your smart wallet address to be able to swap!
- A signer to own the account and sign messages

<Tabs>
  <Tab title="React">
    <Info>Required SDK version: ^v4.70.0</Info>
    
    Use the `usePrepareSwap` hook to request swap quotes and the `useSignAndSendPreparedCalls` hook to execute token swaps on the same chain.
    
    **Prerequisites**
    
    - [Smart Wallets installed and configured in your project](/wallets/react/quickstart)
    - An [authenticated user](/wallets/authentication/overview)
    - Tokens in your smart account to swap
    
    <CodeBlocks>
    
    ```tsx title="swapTokens.tsx"
    import {
      useSmartAccountClient,
      usePrepareSwap,
      useSignAndSendPreparedCalls,
      useWaitForCallsStatus,
      useUser,
    } from "@account-kit/react";
    
    // Token addresses on Arbitrum
    const TOKENS = {
      NATIVE: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEee", // ETH
      USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    } as const;
    
    export default function SwapTokens() {
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
    
      const handleSwap = async () => {
        if (!client?.account.address) {
          throw new Error("No account connected");
        }
    
        try {
          // Step 1: Request swap quote
          const result = await prepareSwapAsync({
            from: client.account.address,
            fromToken: TOKENS.NATIVE,
            toToken: TOKENS.USDC,
            fromAmount: "0x5af3107a4000", // 0.0001 ETH
            // postCalls: [{
            //   to: "0x...",
            //   data: "0x...",
            //   value: "0x0"
            // }], // Optional: batch additional calls after the swap
          });
    
          const { quote, ...calls } = result;
          console.log("Swap quote:", quote);
    
          // Ensure we have user operation calls
          if (calls.rawCalls) {
            throw new Error("Expected user operation calls");
          }
    
          // Step 2: Sign and send the prepared calls
          const callIds = await signAndSendPreparedCallsAsync(calls);
    
          console.log("Transaction sent");
          console.log("Call ID:", callIds?.preparedCallIds[0]);
        } catch (error) {
          console.error("Swap failed:", error);
        }
      };
    
      if (!user) {
        return <div>Please log in to use swap functionality</div>;
      }
    
      return (
        <div>
          <button onClick={handleSwap} disabled={!client}>
            {isPreparingSwap
              ? "Requesting quote..."
              : isSigningAndSendingPreparedCalls
                ? "Signing and sending..."
                : "Swap ETH to USDC"}
          </button>
    
          {signAndSendPreparedCallsResult && (
            <p>
              {isWaitingForConfirmation
                ? "Waiting for confirmation..."
                : error
                  ? `Error: ${error}`
                  : statusResult?.statusCode === 200
                    ? "Swap confirmed!"
                    : `Status: ${statusResult?.statusCode}`}
            </p>
          )}
        </div>
      );
    }
    ```
    
    </CodeBlocks>
    
    ## How it works
    
    1. **Request quote**: `usePrepareSwap` requests a swap quote and prepares the transaction calls
    2. **Destructure result**: Extract `quote` for display and `calls` for signing
    3. **Sign and send**: `useSignAndSendPreparedCalls` signs and submits the transaction
    4. **Track status**: `useWaitForCallsStatus` monitors the transaction until confirmation
    
    The quote includes the minimum amount you'll receive and the expiry time for the quote.
    
    ## Swap options
    
    You can specify either an exact input amount or a minimum output amount:
    
    ```tsx
    // Mode 1: Swap exact input amount
    await prepareSwapAsync({
      from: address,
      fromToken: "0x...",
      toToken: "0x...",
      fromAmount: "0x2710", // Swap exactly 0.01 USDC (10000 in hex, 6 decimals)
    });
    
    // Mode 2: Get minimum output amount
    await prepareSwapAsync({
      from: address,
      fromToken: "0x...",
      toToken: "0x...",
      minimumToAmount: "0x5AF3107A4000", // Get at least 0.0001 ETH (18 decimals)
    });
    ```
    
  </Tab>
  <Tab title="JavaScript">
    <Info>Required SDK version: ^v4.65.0</Info>
    
    You'll need the following env variables:
    
    - `ALCHEMY_API_KEY`: An [Alchemy API Key](https://dashboard.alchemy.com/apps)
    - `ALCHEMY_POLICY_ID`: A [Gas Manager](https://dashboard.alchemy.com/gas-manager/policy/create) policy ID
    - `PRIVATE_KEY`: A private key for a signer
    
    <CodeBlocks>
    
    ```ts title="requestQuote.ts"
    import { swapActions } from "@account-kit/wallet-client/experimental";
    import { client } from "./client";
    
    const account = await client.requestAccount();
    
    // Add the swap actions to the client
    const swapClient = client.extend(swapActions);
    
    // Request the swap quote
    const { quote, ...calls } = await swapClient.requestQuoteV0({
      from: account.address,
      fromToken: "0x...",
      toToken: "0x...",
      minimumToAmount: "0x...",
    });
    
    // Display the swap quote, including the minimum amount to receive and the expiry
    console.log(quote);
    
    // Assert that the calls are not raw calls.
    // This will always be the case when requestQuoteV0 is used without the `returnRawCalls` option,
    // the assertion is just needed for Typescript to recognize the result type.
    if (calls.rawCalls) {
      throw new Error("Expected user operation calls");
    }
    
    // Sign the quote, getting back prepared and signed calls
    const signedCalls = await swapClient.signPreparedCalls(calls);
    
    // Send the prepared calls
    const { preparedCallIds } = await swapClient.sendPreparedCalls(signedCalls);
    
    // Wait for the call to resolve
    const callStatusResult = await swapClient.waitForCallsStatus({
      id: preparedCallIds[0]!,
    });
    
    // Filter through success or failure cases
    if (
      callStatusResult.status !== "success" ||
      !callStatusResult.receipts ||
      !callStatusResult.receipts[0]
    ) {
      throw new Error(
        `Transaction failed with status ${callStatusResult.status}, full receipt:\n ${JSON.stringify(callStatusResult, null, 2)}`,
      );
    }
    
    console.log("Swap confirmed!");
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
    curl -X POST https://api.g.alchemy.com/v2/{apiKey} \
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
    
    <Step title="Request a swap quote">
    
    Note that `postCalls` are optional and allow you to batch an array of calls after the swap.
    
    <Info>
      If you're using an EOA or just want the raw array of calls returned, pass the
      optional parameter `"returnRawCalls": "true"`, this will return a `calls`
      array.
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
            "chainId": "{CHAIN_ID}",
            "fromToken": "{FROM_TOKEN}",
            "toToken": "{TO_TOKEN}",
            "fromAmount": "{FROM_AMOUNT_HEXADECIMAL}",
            "postCalls": [{
              "to:" "{POSTCALL_TO_ADDRESS}",
              "data": "{POSTCALL_DATA}",
              "value": "{POSTCALL_VALUE}"
            }],
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
   