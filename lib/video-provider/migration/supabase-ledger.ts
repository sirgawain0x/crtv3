import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArchivedSource } from './archive';
import type { ImportLedger, ImportRecord, ImportState } from './importer';
const columns='livepeer_asset_id,livepeer_playback_id,source_sha256,source_bytes,state,frameworks_asset_id,frameworks_playback_id,provider_failure_phase,provider_failure_reason';
/** Supply the explicitly selected migration database, never the application's implicit production client. */
export function createImportLedger(db: SupabaseClient,table:'frameworks_asset_imports'|'frameworks_import_recoveries'='frameworks_asset_imports'): ImportLedger {
  const find=async(sourceId:string):Promise<ImportRecord|null>=>{
    const {data,error}=await db.from(table).select(columns).eq('livepeer_asset_id',sourceId).maybeSingle();
    if(error) throw new Error('Cannot read migration import ledger');
    return data as ImportRecord|null;
  };
  return {find,
    async reserve(source:ArchivedSource) {
      const {data,error}=await db.from(table).insert({livepeer_asset_id:source.assetId,
        livepeer_playback_id:source.playbackId,source_sha256:source.sha256,source_bytes:source.sizeBytes,state:'prepared'}).select(columns).single();
      if(!error && data) return data as ImportRecord;
      if(error?.code==='23505') { const existing=await find(source.assetId); if(existing) return existing; }
      throw new Error('Cannot reserve migration import');
    },
    async transition(sourceId:string,expected:ImportState,next:ImportState,target?:{assetId:string;playbackId:string}) {
      const {data,error}=await db.from(table).update({state:next,updated_at:new Date().toISOString(),
        ...(target?{frameworks_asset_id:target.assetId,frameworks_playback_id:target.playbackId}:{})})
        .eq('livepeer_asset_id',sourceId).eq('state',expected).select('livepeer_asset_id');
      if(error) throw new Error('Cannot persist migration import state');
      return data?.length===1;
    },
    async recordProviderFailure(sourceId:string,detail:{phase:string;reason:string}) {
      if(table!=='frameworks_asset_imports') return;
      const {error}=await db.from(table).update({provider_failure_phase:detail.phase,provider_failure_reason:detail.reason,
        provider_failure_recorded_at:new Date().toISOString(),updated_at:new Date().toISOString()})
        .eq('livepeer_asset_id',sourceId).neq('state','ready');
      if(error) throw new Error('Cannot persist provider failure context');
    },
  };
}
