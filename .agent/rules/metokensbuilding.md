---
description: Build with metokens
alwaysApply: false
---
Enumerating All meTokens

Enumeration of all meTokens is available through our Subgraph on Base.  Here is an example query to fetch all available meTokens.



Metadata



Owner Data

Information about the creator is all stored using Ceramic Network's DID product, called OrbisDB. We’re currently using their Clay Testnet implementation.

You can use their read/write Clay node here, and you call the self.id data stream following their docs here. This will provide you with:

Username of the meToken issuer

Avatar photo - used as token logo

Issuer's bio - used as token description

In order to lookup the self.id of a user, you'll need to use the owner address of a meToken for the lookup. You can get the owner address in two steps:

Take an address of a meToken (enumerated by the subgraph),

Pass the address as the arg in the getMeTokenInfo() func in the diamond ABI -  instructions & file included below,

You'll then be returned the owner address.



ABI

Note: instructions below



Token Data

Includes instructions for ABIs. 



Note: all ABIs are listed in the Resources/ABIs section at the bottom. 



Core Protocol (Diamond Standard) 

When it comes to querying the meTokens protocol contracts, our implementation of the Diamond Standard simplifies fetching contract data on-chain.

While MeTokens core contracts are separated into their own respective “facets” for modularization of functionality, you are able to query the entire protocol through the core proxy “diamond” contract.  You can do this through a universal ABI which combines the functions for all facet contracts and simply call the diamond address with the function of the facet you desire. 



Here’s a code snippet on how you can fetch contract state with ease: 

// NOTE: these contract calls are done on mainnet import { ethers } from "hardhat"; import j from "MeTokensDiamond.json";

async function main() { const diamondAddr = "0x0B4ec400e8D10218D0869a5b0036eA4BCf92d905"; const meTokenAddr = "0xC196E1AEcFbe864ec85B2363d17e35D9e62E594A";

const diamond = new ethers.Contract(diamondAddr, j.abi, ethers.provider);
    const {owner} = await diamond.getMeTokenInfo(meTokenAddr);
console.log(owner);
} 
main();

With this template, you can fetch much more MeTokenInfo:

struct MeTokenInfo {
    address owner;
    uint256 hubId;
    uint256 balancePooled;
    uint256 balanceLocked;
    uint256 startTime; // ignore for the sake of simple integrations
    uint256 endTime; // ignore
    uint256 endCooldown; // ignore
    uint256 targetHubId; // ignore
    address migration; // ignore
}

Note: most of these vars can be ignored for the sake of this integration



Token (ERC20 Standard)

Each meToken is a basic ERC20 contract, which you can load and get the token name, symbol, and supply like you would any other token.  Here’s an example for retrieving the meToken name:



import { ethers } from "hardhat";
import j from "MeToken.json";

async function main() {
    const meTokenAddr = "0xC196E1AEcFbe864ec85B2363d17e35D9e62E594A";

    const meToken = new ethers.Contract(meTokenAddr, j.abi, ethers.provider);
        const name = await meTokenRegistry.name();
    console.log(name);
}
main();



Note: We really only display the token symbol on our frontend rather than the token name. The name most often associated with the meToken is defaulted to user's self.id username.

Example: Username, Bob Hope, might set the name of his meToken to Bob's meToken and the symbol to $BOB. On our frontend, we would not typically display Bob's meToken anywhere. We would instead use Bob Hope && $BOB.



ABI



Market Data



TVL

The TVL is the total value locked of the market of a person’s meToken. It is our equivalent of a market cap. In order to calculate TVL, do the following:



Step

Example Returned

1. Call diamond.getMeTokenInfo([meToken address]) to get balancePooled, balanceLocked, and hubId

balancePooled == 10,000, balanceLocked == 5,000, hubId == 1

2. Sum balancePooled and balanceLocked for total balance of the meToken collateral asset

10,000 + 5,000 = 15,000

3. Call diamond.getHubInfo(hubId) to get asset

asset == DAI

4. Determine price of collateral asset by using an oracle of your choice

1 DAI == $1 via Chainlink

5. Multiply price by balance to get TVL

$1 * 15,000 = $15,000 TVL

Note: soon there will be a getTVL([meToken address]) view to handle the above work in one step.

Note: Alternatively, you can substitute steps 1-2 using a subgraph call, like this one. Additionally, you can temporarily substitute steps 3-4 by setting 1 unit of asset = $1 without using an oracle or getHubInfo() call since we’re only using DAI on testnet for right now.



Token Price

The token price is the current price of a meToken along the bonding curve AMM.

Note: while we are still refactoring our subgraph to calculate current price, this is a temporary solution to calculating token price.

Using the MeToken.sol ERC20 contract of a specific meToken, follow these steps:



AMM

Approve

If a user has not yet approved a collateral asset (like DAI) to be spent with the meTokens AMM, they will first need to call approve() in the collateral asset contract, giving approval to the meTokens vault:

https://etherscan.io/address/0x6b175474e89094c44da98b954eedeac495271d0f#writeContract

usr: 0x6BB0B4889663f507f50110B1606CE80aBe9a738d (Vault address)

wad: 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff



Buy & Sell

AMM integration uses FoundryFacet.sol for executing and previewing the following functions.  Interacting with FoundryFacet.sol works the same as the examples above where you connect to the universal diamond ABI.



Func

Type

Input

Output

mint() => buy 

executable

collateral amount to spend

meTokens minted

burn() => sell

executable

meTokens to burn

collateral returned

calculateMeTokensMinted()

viewable

collateral amount to spend

metokens minted

calculateAssetsReturned()

viewable

meTokens to burn

collateral returned

Note: You can use the executable types to execute a swap on the AMM, while you can use the viewable types to preview the expected values returned (for example, in a swap module)



Resources

Contract Address



Block Deployed



15684640

16584506

122208796

Diamond Contracts



Mainnet

Base

Optimism

Diamond.sol

Core meTokens protocol proxy contract.  Through it you can query all meTokens facets and return stored meTokens protocol data.

0x0B4ec400e8D10218D0869a5b0036eA4BCf92d905

0xba5502db2aC2cBff189965e991C07109B14eB3f5

0xdD830E2cdC4023d1744232a403Cf2F6c84e898D1

DiamondCutFacet.sol

Called by governance to add, replace, and remove functions of a facet, as well as add new facets to meTokens protocol.



0x2256CF92163748AF1B30bb0a477C68672Fb14432



DiamondLoupeFacet.sol

Provides helper functions for tools to look at the meTokens diamond and query information such as all facet addresses and their function selectors.



0x5A7861D29088B67Cc03d85c4D89B855201e030EB



OwnershipFacet.sol

Provides access control for meTokens protocol. Learn more HERE.



0xACef1f621DA7a4814696c73EA33F9bD639e15FC9



Core Contracts









MeTokenRegistryFacet.sol

Manages all state for a meToken within meTokens protocol.  From it you can create your meToken and subscribe to a hub, resubscribe your meToken to a different hub, and transfer ownership of your meToken to another user.



0xCb44364CCdb30fc79e7852e778bEc20033a69b8B



FoundryFacet.sol

Manages all minting and burning of meTokens, enables the donation of assets to a meToken owner, and provides calculations for the amount of meTokens minted from mint() and assets returned from burn().



0xA360aeb1C0915E1ebb5F83c533d94ae2EB827Ea8



HubFacet.sol

Manages all hubs for meTokens protocol.  A hub is a unique configuration for a bonding curve of which any meToken can subscribe to.  When a meToken is subscribed to a hub, it will also use that hubs’ vault and underlying asset.



0x0bb01A58802eC340069C68698726A7cB358195F8



FeesFacet.sol

Manages the fee rates for using meTokens, controlled by governance with a max rate of 5%.  Fees for interacting with meTokens protocol may exist for: • Minting a meToken • Burning a meToken as a user for the underlying asset • Burning a meToken as the meToken issuer for the underlying asset



0x4431a3AEb5610FB7082d4Cb0D6b100C288C443b8



CurveFacet.sol

Provides additional views into using the meTokens curve.  This curve is identical to Bancor with an additional formula to calculate minting from 0 supply.



0x52e813d7738a430188a0515Dfe7b8177240CCb9B



Registry Contracts









VaultRegistry.sol

Manages approved vaults for a hub to use.







MigrationRegistry.sol

Manages all migration routes for if a meToken changes its’ underlying asset by resubscribing to a different hub which uses a different vault and/or asset.







Vault Contracts









SingleAssetVault.sol

Base meTokens protocol vault which manages basic ERC20-like underlying assets of created meTokens.







SameAssetTransferMigration.sol

Provides a SingleAssetVault to hold a meTokens’ underlying asset for when a meToken resubscribes to a different hub with the same underlying asset.







UniswapSingleTransferMigration.sol

Provides a SingleAssetVault that instantly swaps a meTokens’ underlying asset to a new asset when the meToken is resubscribing to a different hub with a different underlying asset.  It uses Chainlink’s Feed Registry to fetch the spot price of the asset and provides a max slippage protection of 5%.







Implementation Contracts









MeTokenFactory.sol

Creates and deploys a users’ meToken based on the ERC20 standard.



0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B

0x7BE650f4AA109377c1bBbEE0851CF72A8e7E915C

meToken.sol

This ERC20 contract defines every user-created MeToken and is created through the MeTokenFactory.







Auxilary Contracts









MinimalFowarder.sol

meTokens Protocol deployment of Open Zeppelin’s Minimal Fowarder.









ABIs

About meTokens Smart Contracts

 

meTokens has implemented the Diamond Standard for ease in querying and implementing the meTokens protocol contracts.

 

Developers may choose to query the entire meTokens protocol through a core proxy “diamond” contract, or separate a contract into its own respective “facets” for modularization of functionality. We utilize Hardhat’s hardhat-diamond-abi plugin to create one universal ABI, where developers can utilize the functions for all facet contracts in one source and simply call the diamond address with the function of the facet desired.  You no longer need to dig through multiple contracts to find state!

 

Here’s a code snippet on how you can fetch contract state with ease:

 

// NOTE: all calls are done on base-sepolia
import { ethers } from "hardhat";
import j from "MeTokensDiamond.json";

async function main() {
    const diamondAddr = "0x357d636c40A8E3FbFC983D960292D9fEf56104cb";
    const meTokenAddr = "0x9539e3629e12E89B5a04A2E5703246A1bB5F5052";

    const diamond = new ethers.Contract(diamondAddr, j.abi, ethers.provider);
        const {owner} = await diamond.getMeTokenInfo(meTokenAddr);
    console.log(owner);
}
main();


 

MeTokensDiamond.json

 

Access Levels

 

There are four levels of access within meTokens protocol:

 

Anyone

Owners: Addresses registered as the owner for a meToken or hub.

Controllers: Governance-level addresses controlling protocol functionality (located in OwnershipFacet.sol), including:  Registering a New Hub (RegisterController) Time Period to Update a Hub or Resubscribe a meToken (DurationsController) Deactivating a Hub, which prevents a meToken from subscribing to it (DeactivateController) Adding, Modifying, Removing Facets, and Managing the Trusted Forwarder Used for Meta-Transactions (DiamondController) Fee Rates (FeesController)  

Migrations: Modify meToken balances during a meToken resubscription (approved in MigrationRegistry.sol)

 

 

Anyone

 

Foundry Facet

 

Manages all minting and burning of meTokens, enables the donation of assets to a meToken owner, and provides calculations for the amount of meTokens minted from mint() and assets returned from burn().

 

meTokenRegistry Facet

 

Manages all state for a meToken within meTokens protocol.  From it you can create your meToken and subscribe to a hub, resubscribe your meToken to a different hub, and transfer ownership of your meToken to another user.

 

/// @notice Create and subscribe a meToken to a hub
/// @param name            Name of meToken
/// @param symbol          Symbol of meToken
/// @param hubId           Initial hub to subscribe to
/// @param assetsDeposited Amount of assets deposited at meToken initialization
function subscribe(
    string calldata name,
    string calldata symbol,
    uint256 hubId,
    uint256 assetsDeposited
) external;

/// @notice Finish a meToken's resubscription to a new hub
/// @param meToken  Address of meToken
/// @return         Details of meToken
function finishResubscribe(address meToken)
    external
    returns (MeTokenInfo memory);

/// @notice View to get information for a meToken
/// @param meToken      Address of meToken queried
/// @return meToken     Details of meToken
function getMeTokenInfo(address meToken)
    external
    view
    returns (MeTokenInfo memory);
struct MeTokenInfo {
    address owner;
    uint256 hubId;
    uint256 balancePooled;
    uint256 balanceLocked;
    uint256 startTime;
    uint256 endTime;
    uint256 endCooldown;
    uint256 targetHubId;
    address migration;
}

/// @notice View to return Address of meToken owned by owner
/// @param owner    Address of meToken owner
/// @return         Address of meToken
function getOwnerMeToken(address owner) external view returns (address);

/// @notice View to see the address to claim meToken ownership from
/// @param from Address to transfer meToken ownership
/// @return     Address of pending meToken owner
function getPendingOwner(address from) external view returns (address);

/// @notice Get the meToken resubscribe warmup period
/// @return Period of meToken warmup, in seconds
function meTokenWarmup() external view returns (uint256);

/// @notice Get the meToken resubscribe duration period
/// @return Period of the meToken resubscribe duration, in seconds
function meTokenDuration() external view returns (uint256);

/// @notice Get the meToken resubcribe cooldown period
/// @return Period of the meToken resubscribe cooldown, in seconds
function meTokenCooldown() external view returns (uint256);

/// @notice View to return if an address owns a meToken or not
/// @param owner    Address to query
/// @return         True if owns a meToken, else false
function isOwner(address owner) external view returns (bool);


 

Hub Facet

 

Manages all hubs for meTokens protocol.  A hub is a unique configuration for a bonding curve of which any meToken can subscribe to.  When a meToken is subscribed to a hub, it will also use that hubs’ vault and underlying asset.

 

/// @notice Finish updating a hub
/// @param id  Unique hub identifier
function finishUpdate(uint256 id) external;

/// @notice View to get information for a hub
/// @param id Unique hub identifier
/// @return Information of hub
function getHubInfo(uint256 id) external view returns (HubInfo memory);
struct HubInfo {
    uint256 startTime;
    uint256 endTime;
    uint256 endCooldown;
    uint256 refundRatio;
    uint256 targetRefundRatio;
    address owner;
    address vault;
    address asset;
    bool updating;
    bool reconfigure;
    bool active;
}

/// @notice Counter of hubs registered
/// @return uint256 Unique hub count
function count() external view returns (uint256);

/// @notice Get the hub update warmup period
/// @return Period of hub update warmup, in seconds
function hubWarmup() external view returns (uint256);

/// @notice Get the hub update duration period
/// @return Period of hub update duration, in seconds
function hubDuration() external view returns (uint256);

/// @notice Get the hub update cooldown period
/// @return Period of hub update cooldown, in seconds
function hubCooldown() external view returns (uint256);


 

Fees Facet

 

Manages the fee rates for using meTokens, controlled by governance with a max rate of 5%.  Fees for interacting with meTokens protocol may exist for: • Minting a meToken • Burning a meToken as a user for the underlying asset • Burning a meToken as the meToken issuer for the underlying asset

 

/// @notice Get Mint fee
/// @return uint256 mintFee
function mintFee() external view returns (uint256);

/// @notice Get BurnBuyer fee
/// @return uint256 burnBuyerFee
function burnBuyerFee() external view returns (uint256);

/// @notice Get BurnOwner fee
/// @return uint256 burnOwnerFee
function burnOwnerFee() external view returns (uint256);


 

Diamond Loupe Facet

 

/// @notice Gets all facet addresses and their four byte function selectors.
/// @return facets_ Facet
function facets() external view returns (Facet[] memory facets_);
struct Facet {
    address facetAddress;
    bytes4[] functionSelectors;
}

/// @notice Gets all the function selectors supported by a specific facet.
/// @param facet The facet address.
/// @return facetFunctionSelectors_
function facetFunctionSelectors(address facet)
    external
    view
    returns (bytes4[] memory facetFunctionSelectors_);

/// @notice Get all the facet addresses used by a diamond.
/// @return facetAddresses_
function facetAddresses()
    external
    view
    returns (address[] memory facetAddresses_);

/// @notice Gets the facet that supports the given selector.
/// @dev If facet is not found return address(0).
/// @param functionSelector The function selector.
/// @return facetAddress_ The facet address.
function facetAddress(bytes4 functionSelector)
    external
    view
    returns (address facetAddress_);


 

 

meTokens Owners

 

meTokenRegistry Facet

 

/// @notice Initialize a meToken resubscription to a new hub
/// @param meToken                 Address of meToken
/// @param targetHubId             Hub which meToken is resubscribing to
/// @param migration               Address of migration vault
/// @param encodedMigrationArgs    Additional encoded migration vault arguments
function initResubscribe(
    address meToken,
    uint256 targetHubId,
    address migration,
    bytes memory encodedMigrationArgs
) external;

/// @notice Cancel a meToken resubscription
/// @dev Can only be done during the warmup period
/// @param meToken Address of meToken
function cancelResubscribe(address meToken) external;

/// @notice Transfer meToken ownership to a new owner
/// @param newOwner Address to claim meToken ownership of msg.sender
function transferMeTokenOwnership(address newOwner) external;

/// @notice Cancel the transfer of meToken ownership
function cancelTransferMeTokenOwnership() external;

/// @notice Claim the transfer of meToken ownership
/// @dev only callable by the receipient if the metoken owner
///    submitted transferMeTokenOwnership()
/// @param from Address of current meToken owner
function claimMeTokenOwnership(address from) external;


 

Hub Owner

 

Hub Facet

 

/// @notice Transfer the ownership of a hub
/// @dev Only callable by the hub owner
/// @param id       Unique hub identifier
/// @param newOwner Address to own the hub
function transferHubOwnership(uint256 id, address newOwner) external;

/// @notice Intialize a hub update
/// @param id                   Unique hub identifier
/// @param targetRefundRatio    Target rate to refund burners
/// @param targetReserveWeight  Target curve reserveWeight
function initUpdate(
    uint256 id,
    uint256 targetRefundRatio,
    uint32 targetReserveWeight
) external;

/// @notice Cancel a hub update
/// @dev Can only be called before startTime
/// @param id Unique hub identifier
function cancelUpdate(uint256 id) external;


 

 

Controllers

 

⚠️ NOTE: Creating a custom hub for a meToken is currently unavailable. Stay tuned for more information on this upgrade! 

Register Controller

 

Hub Facet

 

/// @notice Register a new hub
/// @param owner            Address to own hub
/// @param asset            Address of vault asset
/// @param vault            Address of vault
/// @param refundRatio      Rate to refund burners
/// @param baseY            baseY curve details
/// @param reserveWeight    reserveWeight curve details
/// @param encodedVaultArgs Additional encoded vault arguments
function register(
    address owner,
    address asset,
    IVault vault,
    uint256 refundRatio,
    uint256 baseY,
    uint32 reserveWeight,
    bytes memory encodedVaultArgs
) external;


 

Ownership Facet

 

function setRegisterController(address newController) external;


 

Durations Controller

 

meTokenRegistry Facet

 

/// @notice Get the time period for a meToken to warmup, which is the time
///     difference between when initResubscribe() is called and when the
///     resubscription is live
function setMeTokenWarmup(uint256 amount) external;

/// @notice Get the time period for a meToken to resubscribe, which is the time
///     difference between when the resubscription is live and when
///     finishResubscription() can be called
function setMeTokenDuration(uint256 amount) external;

/// @notice Get the time period for a meToken to cooldown, which is the time
///     difference between when finishResubscription can be called and when
///     initResubscribe() can be called again
function setMeTokenCooldown(uint256 amount) external;


 

Hub Facet

 

/// @notice Get the time period for a hub to warmup, which is the time
///     difference between initUpdate() is called and when the update
///     is live
/// @param amount   Amount of time, in seconds
function setHubWarmup(uint256 amount) external;

/// @notice Set the time period for a hub to update, which is the time
///     difference between when the update is live and when finishUpdate()
///     can be called
/// @param amount   Amount of time, in seconds
function setHubDuration(uint256 amount) external;

/// @notice Set the time period for a hub to cooldown, which is the time
///     difference between when finishUpdate() can be called and when initUpdate()
///     can be called again
/// @param amount   Amount of time, in seconds
function setHubCooldown(uint256 amount) external;


 

Ownership Facet

 

function setDurationsController(address newController) external;


 

Deactivate Controller

 

Hub Facet

 

/// @notice Deactivate a hub, which prevents a meToken from subscribing
///     to it
/// @param id Unique hub identifier
function deactivate(uint256 id) external;


 

Ownership Facet

 

function setDeactivateController(address newController) external;


 

Diamond Controller

 

Diamond Cut Facet

 

/// @notice Add/replace/remove any number of functions and optionally execute
///         a function with delegatecall
/// @param cut Contains the facet addresses and function selectors
/// @param init The address of the contract or facet to execute calldata
/// @param data A function call, including function selector and arguments
///                  calldata is executed with delegatecall on init
function diamondCut(
    FacetCut[] calldata cut,
    address init,
    bytes calldata data
) external;


 

Ownership Facet

 

function setDiamondController(address newController) external;
function setTrustedForwarder(address forwarder) external;


 

Fees Controller

 

Fees Facet

 

/// @notice Set Mint fee for meTokens protocol
/// @param rate New fee rate
function setMintFee(uint256 rate) external;

/// @notice Set BurnBuyer fee for meTokens protocol
/// @param rate New fee rate
function setBurnBuyerFee(uint256 rate) external;

/// @notice Set BurnOwner fee for meTokens protocol
/// @param rate New fee rate
function setBurnOwnerFee(uint256 rate) external;


 

Ownership Facet

 

function setFeesController(address newController) external;


 

 

Migrations

 

 ⚠️ NOTE: Creating a custom hub for a meToken is currently unavailable. Stay tuned for more information on this upgrade!

 

meTokenRegistry Facet

 

/// @notice Update a meToken's balanceLocked and balancePooled
/// @param meToken     Address of meToken
/// @param newBalance  Rate to multiply balances by
function updateBalances(address meToken, uint256 newBalance) external;
