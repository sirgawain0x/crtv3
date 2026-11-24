import { createHash } from 'node:crypto';
import { CREATIVE_TV_ASSET_UUID_REGEX } from '@/lib/utils/creative-tv-url';
import type { ArchivedSource } from './archive';
import { isVideoAssetId } from '../asset-id';
import {ImportStoppedError,MigrationProviderFailure} from './import-failure';
export type ImportState = 'prepared' | 'importing' | 'processing' | 'ready' | 'ambiguous' | 'failed';
export type ImportRecord = {
  livepeer_asset_id: string; livepeer_playback_id: string | null; source_sha256: string; source_bytes: number;
  state: ImportState; frameworks_asset_id: string | null; frameworks_playback_id: string | null;
};
export interface ImportLedger {
  find(sourceId: string): Promise<ImportRecord | null>;
  reserve(source: ArchivedSource): Promise<ImportRecord>;
  transition(sourceId: string, expected: ImportState, next: ImportState,
    target?: { assetId: string; playbackId: string }): Promise<boolean>;
}
export type ProtectedUpload = { assetId: string; playbackId: string; uploadId: string;
  partSize: number; parts: Array<{ partNumber: number; url: string }> };
export interface ImportProvider {
  /** Must confirm JWT policy before returning part URLs or transferring any source bytes. */
  createProtectedUpload(source: ArchivedSource): Promise<ProtectedUpload>;
  uploadPart(url: string, bytes: Uint8Array): Promise<string>;
  complete(uploadId: string, parts: Array<{partNumber: number; etag: string}>): Promise<{assetId:string;playbackId:string}>;
  inspect(assetId: string): Promise<{assetId:string;playbackId:string;phase:string;durationSeconds?:number} | null>;
  confirmProtection(assetId: string, playbackId: string): Promise<void>;
}
export interface VerifiedImportSource {
  /** Full content hash and exact byte count, not a filename/HEAD-only check. */
  verify(source: ArchivedSource): Promise<void>;
  read(offset: number, length: number): Promise<Uint8Array>;
}
export type ImportOutcome = { state: ImportState; sourceId: string; action: 'created'|'polled'|'unchanged'|'needs-reconciliation' };
function matches(record: ImportRecord, source: ArchivedSource): boolean {
  return record.livepeer_asset_id === source.assetId && record.livepeer_playback_id === source.playbackId &&
    record.source_sha256 === source.sha256 && record.source_bytes === source.sizeBytes;
}
function targetOf(record: ImportRecord): { assetId: string; playbackId: string } {
  if (!record.frameworks_asset_id || !record.frameworks_playback_id ||
      !isVideoAssetId(record.frameworks_asset_id) || !isVideoAssetId(record.frameworks_playback_id)) throw new Error('Import target identities are missing');
  return { assetId:record.frameworks_asset_id, playbackId:record.frameworks_playback_id };
}

/** One bounded import/poll. Never recreates a reserved import after a crash, timeout or ambiguous response. */
export async function runAssetImport(input: {source: ArchivedSource; ledger: ImportLedger; provider: ImportProvider; file?: VerifiedImportSource}): Promise<ImportOutcome> {
  const {source,ledger,provider,file} = input;
  if (!CREATIVE_TV_ASSET_UUID_REGEX.test(source.assetId) || !/^[a-f0-9]{64}$/.test(source.sha256) ||
      !Number.isSafeInteger(source.sizeBytes) || source.sizeBytes <= 0) throw new Error('Invalid archived source evidence');
  let record=await ledger.find(source.assetId);
  if (record && !matches(record,source)) throw new Error('Source evidence differs from its reserved import');
  if (record?.state === 'processing') {
    const target=targetOf(record);
    const asset=await provider.inspect(target.assetId);
    if (!asset) return {sourceId:source.assetId,state:'processing',action:'polled'};
    if (asset.assetId !== target.assetId || asset.playbackId !== target.playbackId) throw new Error('Provider inspection returned conflicting identities');
    if (asset.phase.toLowerCase() === 'failed') {
      await ledger.transition(source.assetId,'processing','failed');
      return {sourceId:source.assetId,state:'failed',action:'polled'};
    }
    if (asset.phase.toLowerCase() === 'ready' && Number.isFinite(asset.durationSeconds) && asset.durationSeconds! > 0) {
      await provider.confirmProtection(target.assetId,target.playbackId);
      if (!(await ledger.transition(source.assetId,'processing','ready'))) throw new Error('Import state changed during ready verification');
      return {sourceId:source.assetId,state:'ready',action:'polled'};
    }
    return {sourceId:source.assetId,state:'processing',action:'polled'};
  }
  if (record && record.state !== 'prepared') {
    return {sourceId:source.assetId,state:record.state,action:['importing','ambiguous'].includes(record.state)?'needs-reconciliation':'unchanged'};
  }
  if (!file) throw new Error('A checksum-verified local source is required for a new import');
  await file.verify(source);
  record=record ?? await ledger.reserve(source);
  if (!matches(record,source)) throw new Error('Source evidence differs from its reserved import');
  if (record.state !== 'prepared' || !(await ledger.transition(source.assetId,'prepared','importing'))) {
    return {sourceId:source.assetId,state:record.state,action:'unchanged'};
  }
  let recordedTarget=false;
  try {
    const upload=await provider.createProtectedUpload(source);
    if (!isVideoAssetId(upload.assetId) || !isVideoAssetId(upload.playbackId) || !upload.uploadId ||
        !Number.isSafeInteger(upload.partSize) || upload.partSize <= 0 || upload.partSize > 128*1024*1024 ||
        upload.parts.length !== Math.ceil(source.sizeBytes/upload.partSize) ||
        upload.parts.some((part,i)=>part.partNumber !== i+1 || new URL(part.url).protocol !== 'https:')) throw new Error('Invalid protected upload session');
    const target={assetId:upload.assetId,playbackId:upload.playbackId};
    if (!(await ledger.transition(source.assetId,'importing','processing',target))) throw new Error('Could not persist upload target');
    recordedTarget=true;
    const transferredHash=createHash('sha256');
    const completedParts: Array<{partNumber:number;etag:string}>=[];
    for (const part of upload.parts) {
      const offset=(part.partNumber-1)*upload.partSize;
      const length=Math.min(upload.partSize,source.sizeBytes-offset);
      const bytes=await file.read(offset,length);
      if (bytes.byteLength !== length) throw new Error('Source changed or became truncated');
      transferredHash.update(bytes);
      const etag=await provider.uploadPart(part.url,bytes);
      if (!etag.trim()) throw new Error('Upload part returned no ETag');
      completedParts.push({partNumber:part.partNumber,etag});
    }
    if (transferredHash.digest('hex') !== source.sha256) throw new Error('Transferred bytes do not match archive checksum');
    const completed=await provider.complete(upload.uploadId,completedParts);
    if (completed.assetId !== target.assetId || completed.playbackId !== target.playbackId) throw new Error('Completion returned conflicting identities');
    return {sourceId:source.assetId,state:'processing',action:'created'};
  } catch (error) {
    // Do not record provider messages: they can contain signed URLs, headers or other private context.
    await ledger.transition(source.assetId,recordedTarget?'processing':'importing','ambiguous');
    if(error instanceof MigrationProviderFailure)throw new ImportStoppedError(error.failureCode);
    throw new Error('Import stopped with an uncertain outcome; reconcile its reservation before any retry');
  }
}
