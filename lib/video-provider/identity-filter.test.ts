import {afterEach,describe,expect,it,vi} from 'vitest';
import {filterVideoIdentity,normalizeVideoIdentity} from './identity-filter';
afterEach(()=>vi.unstubAllEnvs());
describe('provider identity aliases',()=>{
 it('preserves opaque ID case and normalizes only UUIDs',()=>{
  expect(normalizeVideoIdentity('  Hash_Case-1 ')).toBe('Hash_Case-1');
  expect(normalizeVideoIdentity('2499B6B6-314F-4251-B119-FBB6445A48A5')).toBe('2499b6b6-314f-4251-b119-fbb6445a48a5');
 });
 it('uses exact IDs without referencing new columns on Livepeer deployments',()=>{
  vi.stubEnv('VIDEO_PROVIDER','livepeer');const query={eq:vi.fn(()=>1),or:vi.fn(()=>2)};
  expect(filterVideoIdentity(query,'asset_id','Hash_1')).toBe(1);expect(query.eq).toHaveBeenCalledWith('asset_id','Hash_1');expect(query.or).not.toHaveBeenCalled();
 });
 it('accepts both active and historical identities after cutover',()=>{
  vi.stubEnv('VIDEO_PROVIDER','frameworks');const query={eq:vi.fn(()=>1),or:vi.fn(()=>2)};
  expect(filterVideoIdentity(query,'asset_id','Hash_1')).toBe(2);expect(query.or).toHaveBeenCalledWith('asset_id.eq.Hash_1,livepeer_asset_id.eq.Hash_1');
  filterVideoIdentity(query,'playback_id','old-play');expect(query.or).toHaveBeenLastCalledWith('playback_id.eq.old-play,livepeer_playback_id.eq.old-play');
 });
 it('rejects PostgREST filter injection before querying',()=>{
  const query={eq:vi.fn(),or:vi.fn()};expect(()=>filterVideoIdentity(query,'asset_id','id,creator_id.neq.null')).toThrow(/Invalid/);expect(query.or).not.toHaveBeenCalled();expect(query.eq).not.toHaveBeenCalled();
 });
});
