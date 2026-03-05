import { Bytes, BigInt } from "@graphprotocol/graph-ts"
import { Transfer as CatalogTransfer } from "../generated/CatalogRegistry/Catalog"
import { SoundEditionCreated } from "../generated/SoundFactory/SoundCreatorV2"
import { CreatedDrop } from "../generated/ZoraDrops/ZoraNFTCreator"
import { Transfer as TemplateTransfer } from "../generated/templates/MusicNFTCollection/ERC721"
import { MusicTrack } from "../generated/schema"
import { MusicNFTCollection } from "../generated/templates"

const CHAIN_ETH = "ethereum"

// 1. CATALOG: Handles 1-of-1 song mints (Zora V1 protocol)
export function handleCatalogTransfer(event: CatalogTransfer): void {
  // A "mint" in Web3 is just a transfer from the 0x000... address
  if (event.params.from.toHexString() == "0x0000000000000000000000000000000000000000") {
    // Create a unique ID using the Contract Address + Token ID
    let id = event.address.toHexString() + "-" + event.params.tokenId.toString()
    let track = new MusicTrack(id)
    track.artist = event.params.to.toHexString()
    track.platform = "Catalog"
    track.chain = CHAIN_ETH
    track.contract = Bytes.fromHexString(event.address.toHexString())
    track.tokenId = event.params.tokenId
    track.owner = Bytes.fromHexString(event.params.to.toHexString())
    track.createdAt = event.block.timestamp
    track.save()
  }
}

// 2. SOUND.XYZ: Handles when an artist deploys a new album
export function handleSoundCreated(event: SoundEditionCreated): void {
  let newAlbumAddress = event.params.soundEdition

  // A. Tell the template to start indexing this specific album's future mints
  MusicNFTCollection.create(newAlbumAddress)

  // B. Save the Master Record for the album (collection-level; tokenId 0)
  let track = new MusicTrack(newAlbumAddress.toHexString())
  track.artist = event.params.deployer.toHexString()
  track.platform = "Sound.xyz"
  track.chain = CHAIN_ETH
  track.contract = Bytes.fromHexString(newAlbumAddress.toHexString())
  track.tokenId = BigInt.fromI32(0)
  track.owner = Bytes.fromHexString(event.params.deployer.toHexString())
  track.createdAt = event.block.timestamp
  track.save()
}

// 3. ZORA: Handles when an artist creates a new music drop
export function handleZoraDrop(event: CreatedDrop): void {
  let dropAddress = event.params.editionContractAddress

  // A. Tell the template to start indexing this specific drop
  MusicNFTCollection.create(dropAddress)

  // B. Save the Master Record for the drop (collection-level; tokenId 0)
  let track = new MusicTrack(dropAddress.toHexString())
  track.artist = event.params.creator.toHexString()
  track.platform = "Zora"
  track.chain = CHAIN_ETH
  track.contract = Bytes.fromHexString(dropAddress.toHexString())
  track.tokenId = BigInt.fromI32(0)
  track.owner = Bytes.fromHexString(event.params.creator.toHexString())
  track.createdAt = event.block.timestamp
  track.save()
}

// 4. THE TEMPLATE: Handles individual song mints from Sound and Zora
export function handleTemplateTransfer(event: TemplateTransfer): void {
  // Watch for the actual fans minting the songs from the factory contracts
  if (event.params.from.toHexString() == "0x0000000000000000000000000000000000000000") {
    let id = event.address.toHexString() + "-" + event.params.tokenId.toString()
    let track = new MusicTrack(id)
    track.artist = event.params.to.toHexString() // The fan who minted it
    track.platform = "Legacy Drop"
    track.chain = CHAIN_ETH
    track.contract = Bytes.fromHexString(event.address.toHexString())
    track.tokenId = event.params.tokenId
    track.owner = Bytes.fromHexString(event.params.to.toHexString())
    track.createdAt = event.block.timestamp
    track.save()
  }
}