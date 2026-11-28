import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({original:vi.fn(),recovered:vi.fn(),asset:vi.fn(),secure:vi.fn(),inspect:vi.fn()}));
vi.mock('./supabase-ledger',()=>({createImportLedger:(_:unknown,table?:string)=>({find:table?m.recovered:m.original})}));
vi.mock('../frameworks/assets',()=>({frameworksAssets:{get:m.asset}}));
vi.mock('../frameworks/vod-policy',()=>({secureFrameworksVod:m.secure}));
vi.mock('./inspect-playback',()=>({inspectMigrationPlayback:m.inspect}));
import {prepareReviewedRecovery,adoptVerifiedRecovery} from './reviewed-recovery';
const source={assetId:'bd18c602-9323-4b6e-aa90-7f8e8065e416',playbackId:'bd18hlmb6vazgsy8',sizeBytes:160998594,sha256:'ab4ea28fdac612cf2f1f588ace9691683ac85fe3e9c84193e0e0c044a111313e'};
const rpc=vi.fn();const db={rpc} as any;
beforeEach(()=>{vi.clearAllMocks();rpc.mockResolvedValue({error:null});m.original.mockResolvedValue({state:'ambiguous',frameworks_asset_id:'202611241631464302d8bfdb5ddbae',frameworks_playback_id:'mBdbNNDWgTBDqQfu'});m.asset.mockResolvedValue({id:'202611241631464302d8bfdb5ddbae',playbackId:'mBdbNNDWgTBDqQfu',status:{phase:'processing'}});m.secure.mockResolvedValue(undefined);m.recovered.mockResolvedValue({state:'ready',livepeer_playback_id:source.playbackId,source_sha256:source.sha256,source_bytes:source.sizeBytes,frameworks_asset_id:'replacement',frameworks_playback_id:'replacement-play'});m.inspect.mockResolvedValue({playableManifest:true});});
describe('reviewed replacement boundary',()=>{
 it('never applies a generic retry to another source or changed proof',async()=>{
  await expect(prepareReviewedRecovery(db,{...source,sha256:'b'.repeat(64)},'reviewer')).rejects.toThrow(/reviewed/);expect(m.original).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
 });
 it('reconfirms original protection before reserving a separate attempt',async()=>{
  await prepareReviewedRecovery(db,source,'0xABC');expect(m.secure).toHaveBeenCalledWith('202611241631464302d8bfdb5ddbae','mBdbNNDWgTBDqQfu');expect(rpc).toHaveBeenCalledWith('prepare_reviewed_frameworks_recovery',{p_reviewer:'0xabc'});
 });
 it('refuses ready or changed originals and failed quarantine confirmation',async()=>{
  m.asset.mockResolvedValueOnce({id:'202611241631464302d8bfdb5ddbae',playbackId:'mBdbNNDWgTBDqQfu',status:{phase:'ready'}});
  await expect(prepareReviewedRecovery(db,source,'reviewer')).rejects.toThrow(/changed/);
  m.secure.mockRejectedValueOnce(new Error('Unavailable'));await expect(prepareReviewedRecovery(db,source,'reviewer')).rejects.toThrow(/Unavailable/);expect(rpc).not.toHaveBeenCalled();
 });
 it('requires positive ready proof, both protections and playable HLS before adopting',async()=>{
  m.inspect.mockResolvedValueOnce({playableManifest:false});await expect(adoptVerifiedRecovery(db,source)).rejects.toThrow(/playback/);expect(rpc).not.toHaveBeenCalled();
  await adoptVerifiedRecovery(db,source);expect(rpc).toHaveBeenCalledWith('adopt_verified_frameworks_recovery',{p_source:source.assetId});expect(m.secure).toHaveBeenCalledWith('replacement','replacement-play');
 });
});
