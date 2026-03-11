import { dataSource, DataSourceContext, Bytes, BigInt } from "@graphprotocol/graph-ts";
import { MusicTrack } from "../generated/schema";
import { CreatedCollection as CreatedCollectionMintSongs } from "../generated/MintSongsFactory/MintSongsFactory";
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

export function handleMintSongsCreatedCollection(event: CreatedCollectionMintSongs): void {
  const context = new DataSourceContext();
  context.setString("platform", "Mint Songs");
  context.setString("chain", "polygon");
  MusicNFTCollection.createWithContext(event.params.collectionAddress, context);
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
