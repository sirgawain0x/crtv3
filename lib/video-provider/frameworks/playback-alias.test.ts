import {beforeEach,describe,expect,it,vi} from 'vitest';
const {lookup,eq}=vi.hoisted(()=>({lookup:vi.fn(),eq:vi.fn()}));
vi.mock('@/lib/sdk/supabase/service',()=>({createServiceClient:()=>({from:(table:string)=>{expect(table).toBe('frameworks_asset_imports');const chain={select:()=>chain,eq:(...args:unknown[])=>{eq(...args);return chain;},maybeSingle:lookup};return chain;}})}));
import {resolveFrameworksPlaybackAlias} from './playback-alias';
beforeEach(()=>{vi.clearAllMocks();lookup.mockResolvedValue({data:null,error:null});});
describe('verified playback aliases',()=>{
 it('uses only a ready mapping and preserves exact opaque ID case',async()=>{
  lookup.mockResolvedValue({data:{frameworks_playback_id:'New_Case'},error:null});expect(await resolveFrameworksPlaybackAlias('old-play')).toBe('New_Case');expect(eq).toHaveBeenCalledWith('state','ready');
 });
 it('keeps already canonical IDs when there is no legacy mapping',async()=>{expect(await resolveFrameworksPlaybackAlias('New_Case')).toBe('New_Case');});
 it('fails closed on ambiguity, unavailable storage, malformed targets and filter injection',async()=>{
  for(const result of [{data:null,error:{}},{data:{frameworks_playback_id:'bad/id'},error:null}]) {lookup.mockResolvedValue(result);await expect(resolveFrameworksPlaybackAlias('old-play')).rejects.toThrow(/unavailable/);}
  await expect(resolveFrameworksPlaybackAlias('bad,id')).rejects.toThrow(/Invalid/);
 });
});
