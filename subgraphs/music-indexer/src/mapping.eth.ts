import { dataSource, DataSourceContext, Bytes, BigInt } from "@graphprotocol/graph-ts";
import { MusicTrack } from "../generated/schema";
import { Mint as MintEvent } from "../generated/CatalogRegistry/Catalog";
import { CreatedCollection as CreatedCollectionSound } from "../generated/SoundFactory/MintSongsFactory";
import { CreatedCollection as CreatedCollectionRoyal } from "../generated/RoyalFactory/MintSongsFactory";
import { Transfer as TransferEvent } from "../generated/EulerBeatPrints/ERC721";
import { Transfer as TransferEventZora } from "../generated/ZoraMedia/ERC721";
import { Transfer as TransferEventTemplate } from "../generated/templates/MusicNFTCollection/ERC721";
import { MusicNFTCollection } from "../generated/templates";

const ZERO = "0x0000000000000000000000000000000000000000";

function trackId(network: string, contract: string, tokenId: string): string {
  return network + "-" + contract + "-" + tokenId;
}

function createOrUpdateTrack(
  id: string,
  platform: string,
  chain: string,
  contractHex: string,
  tokenId: string,
  ownerHex: string,
  timestamp: string,
  metadataUri: string | null
): void {
  let track = MusicTrack.load(id);
  if (track == null) {
    track = new MusicTrack(id);
    track.platform = platform;
    track.chain = chain;
    track.contract = Bytes.fromHexString(contractHex);
    track.tokenId = BigInt.fromString(tokenId);
    track.createdAt = BigInt.fromString(timestamp);
    if (metadataUri) track.metadataUri = metadataUri;
  }
  track.owner = Bytes.fromHexString(ownerHex);
  track.save();
}

function processTransfer(
  contractHex: string,
  tokenIdStr: string,
  fromHex: string,
  toHex: string,
  timestamp: string,
  platform: string,
  chain: string
): void {
  const network = dataSource.network();
  const id = trackId(network, contractHex, tokenIdStr);
  if (fromHex != ZERO) {
    const track = MusicTrack.load(id);
    if (track != null) {
      track.owner = Bytes.fromHexString(toHex);
      track.save();
    }
    return;
  }
  createOrUpdateTrack(id, platform, chain, contractHex, tokenIdStr, toHex, timestamp, null);
}

export function handleCatalogMint(event: MintEvent): void {
  const network = dataSource.network();
  const chain = network == "mainnet" ? "ethereum" : network;
  const id = trackId(network, event.address.toHexString(), event.params.tokenId.toString());
  createOrUpdateTrack(
    id,
    "Catalog",
    chain,
    event.address.toHexString(),
    event.params.tokenId.toString(),
    event.params.creator.toHexString(),
    event.block.timestamp.toString(),
    event.params.metadataUri
  );
}

export function handleSoundCreatedCollection(event: CreatedCollectionSound): void {
  const context = new DataSourceContext();
  context.setString("platform", "Sound");
  context.setString("chain", "ethereum");
  MusicNFTCollection.createWithContext(event.params.collectionAddress, context);
}

export function handleRoyalCreatedCollection(event: CreatedCollectionRoyal): void {
  const context = new DataSourceContext();
  context.setString("platform", "Royal");
  context.setString("chain", "ethereum");
  MusicNFTCollection.createWithContext(event.params.collectionAddress, context);
}

export function handleEulerBeatTransfer(event: TransferEvent): void {
  processTransfer(
    event.address.toHexString(),
    event.params.tokenId.toString(),
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    event.block.timestamp.toString(),
    "EulerBeat",
    "ethereum"
  );
}

export function handleZoraTransfer(event: TransferEventZora): void {
  processTransfer(
    event.address.toHexString(),
    event.params.tokenId.toString(),
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    event.block.timestamp.toString(),
    "Zora",
    "ethereum"
  );
}

export function handleTemplateTransfer(event: TransferEventTemplate): void {
  const ctx = dataSource.context();
  const platform = ctx.getString("platform");
  const chain = ctx.getString("chain");
  processTransfer(
    event.address.toHexString(),
    event.params.tokenId.toString(),
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    event.block.timestamp.toString(),
    platform,
    chain
  );
}
