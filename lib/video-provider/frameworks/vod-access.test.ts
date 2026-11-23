import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
const {verify,getAsset,secure}=vi.hoisted(()=>({verify:vi.fn(),getAsset:vi.fn(),secure:vi.fn()}));
vi.mock('@/lib/auth/require-wallet',()=>({verifyWalletAuthArgs:verify}));
vi.mock('./assets',()=>({frameworksAssets:{get:getAsset}}));vi.mock('./vod-policy',()=>({secureFrameworksVod:secure}));
import {registerProtectedVod,updateFrameworksVodAccess} from './vod-access';
const creator='0x'+'a'.repeat(40);const rpc=vi.fn(),single=vi.fn(),insert=vi.fn();
const db={from:()=>({select:()=>({eq:()=>({single})}),insert}),rpc} as unknown as SupabaseClient;
beforeEach(()=>{vi.clearAllMocks();verify.mockResolvedValue({address:creator});single.mockResolvedValue({data:{asset_id:'asset',playback_id:'play',creator_id:creator}});getAsset.mockResolvedValue({id:'asset',playbackId:'play',status:{phase:'ready'}});rpc.mockResolvedValue({error:null});insert.mockResolvedValue({error:null});});
describe('verified VOD publishing',()=>{
 it('requires owner proof, ready media and confirmed upstream protection before the atomic write',async()=>{
  await updateFrameworksVodAccess(db,1,{status:'published',requires_metoken:true,metoken_price:2});
  expect(verify).toHaveBeenCalled();expect(secure).toHaveBeenCalledWith('asset','play');
  expect(rpc).toHaveBeenCalledWith('update_frameworks_vod_access',expect.objectContaining({p_owner:creator,p_status:'published',p_requires_metoken:true,p_metoken_price:2,p_price_supplied:true}));
 });
 it('cannot publish with absent or mismatched wallet proof',async()=>{
  verify.mockRejectedValueOnce(new Error('Missing wallet proof'));await expect(updateFrameworksVodAccess(db,1,{status:'published'})).rejects.toThrow(/proof/);
  verify.mockResolvedValueOnce({address:'0x'+'b'.repeat(40)});await expect(updateFrameworksVodAccess(db,1,{status:'published'})).rejects.toThrow(/ownership/);expect(rpc).not.toHaveBeenCalled();
 });
 it('cannot publish unready media or after an upstream policy failure',async()=>{
  getAsset.mockResolvedValueOnce({id:'asset',playbackId:'play',status:{phase:'processing'}});await expect(updateFrameworksVodAccess(db,1,{status:'published'})).rejects.toThrow(/not ready/);
  secure.mockRejectedValueOnce(new Error('Policy unavailable'));await expect(updateFrameworksVodAccess(db,1,{status:'published'})).rejects.toThrow(/Policy/);expect(rpc).not.toHaveBeenCalled();
 });
 it('registers draft ownership without upserting or exposing source bytes',async()=>{
  await registerProtectedVod(db,{assetId:'asset',playbackId:'play',creator});expect(insert).toHaveBeenCalledWith({asset_id:'asset',playback_id:'play',creator_id:creator,status:'draft',requires_metoken:false});
  insert.mockResolvedValueOnce({error:{code:'23505'}});await expect(registerProtectedVod(db,{assetId:'asset',playbackId:'play',creator})).rejects.toThrow(/ownership/);
 });
 it('does not treat ordinary metadata as a playback permission update',async()=>{
  await updateFrameworksVodAccess(db,1,{});expect(verify).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
 });
});
