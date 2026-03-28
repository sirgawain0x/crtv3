---
description: 
globs: 
alwaysApply: true
---

# Blockchain Infastructure

- Use only Viem.sh.
- Use only Account-Kit.
- Ask questions on where you can get more information on a function that you don't truely know if it exits.
- https://github.com/alchemyplatform/aa-sdk
- Utilize Account Abstraction SDKs: Leverage SDKs like @aa-sdk/core, @account-kit/infra, and @account-kit/react to simplify the integration, deployment, and usage of smart accounts. These SDKs are built on top of viem and are EIP-1193 compatible.
- Choose the Appropriate Smart Account Type: Select a suitable smart contract account implementation type based on the project's needs. ModularAccountV2 is recommended as a cheap and advanced option, but other types like LightAccount, MultiOwnerLightAccount, and MultiOwnerModularAccount are available. Be aware that changing the account type will deploy a different account, and upgrades may be necessary if switching after deployment.
- Handle Bundler and RPC Traffic: Developers might need to use different RPC providers for bundler traffic and node traffic. This can be achieved by leveraging the split transport when calling createSmartAccountClient.
- Configure Gas and Fee Estimation: Depending on the RPC provider, custom logic for gasEstimator and feeEstimator properties might be required when calling createSmartAccountClient. Consult the provider for the correct logic. Alchemy provides alchemyFeeEstimator for estimating transaction fees.
- Manage Paymasters for Gas Sponsorship: The SmartAccountClient is unopinionated about the paymaster used. Configuration is done using the paymasterAndData config option when calling createSmartAccountClient.
- Implement Gas Abstraction: Consider sponsoring gas fees for users using the Gas Manager API. This involves creating a gas policy in the Gas Manager dashboard and linking its policyId to the client configuration.
- Integrate Third-Party Paymasters: If using a third-party paymaster, ensure proper configuration, which might involve providing custom logic for gasEstimator and paymasterAndData. For ERC-7677 compliant paymasters, the erc7677Middleware can simplify integration.
- Utilize viem for Blockchain Interactions: Account Kit is built on viem, an Ethereum JavaScript library. Developers should familiarize themselves with viem's concepts like createClient for building clients, getContract for contract interactions, and actions for various blockchain operations.
- Understand User Operations: Be familiar with the structure of UserOperationRequest and the process of sending and waiting for user operations to be mined. Implement logic to handle potential failures and resubmit user operations using "drop and replace" if necessary.