import { createHash } from 'node:crypto';
import { describe,expect,it,vi } from 'vitest';
import { runAssetImport,type ImportLedger,type ImportProvider,type ImportRecord,type ImportState } from './importer';
import {ImportStoppedError,MigrationProviderFailure} from './import-failure';
const bytes=new Uint8Array([1,2,3,4,5]);
const source={assetId:'2499b6b6-314f-4251-b119-fbb6445a48a5',playbackId:'old-play',sizeBytes:5,sha256:createHash('sha256').update(bytes).digest('hex')};
function fixture(initial?:ImportState) {
  let record:ImportRecord|null=initial?{livepeer_asset_id:source.assetId,livepeer_playback_id:source.playbackId,source_bytes:5,source_sha256:source.sha256,state:initial,frameworks_asset_id:'target',frameworks_playback_id:'play'}:null;
  const ledger:ImportLedger={find:async()=>record&&{...record},reserve:vi.fn(async()=>record??(record={livepeer_asset_id:source.assetId,livepeer_playback_id:source.playbackId,source_bytes:5,source_sha256:source.sha256,state:'prepared',frameworks_asset_id:null,frameworks_playback_id:null})),transition:vi.fn(async(_,expected,next,target)=>{
    if(record?.state!==expected)return false;
    record={...record,state:next,...(target?{frameworks_asset_id:target.assetId,frameworks_playback_id:target.playbackId}:{})};return true;
  })};
  const provider:ImportProvider={createProtectedUpload:vi.fn(async()=>({assetId:'target',playbackId:'play',uploadId:'session',partSize:3,parts:[{partNumber:1,url:'https://upload.example/1'},{partNumber:2,url:'https://upload.example/2'}]})),
    uploadPart:vi.fn(async()=> 'etag'),complete:vi.fn(async()=>({assetId:'target',playbackId:'play'})),
    inspect:vi.fn(async()=>({assetId:'target',playbackId:'play',phase:'ready',durationSeconds:2})),confirmProtection:vi.fn(async()=>{})};
  const file={verify:vi.fn(async()=>{}),read:vi.fn(async(offset:number,length:number)=>bytes.slice(offset,offset+length))};
  return {ledger,provider,file,getRecord:()=>record};
}
describe('resumable protected imports',()=>{
  it('retains an ambiguous reservation while returning only the fixed preparation failure classification',async()=>{
    const f=fixture();vi.mocked(f.provider.createProtectedUpload).mockRejectedValue(new MigrationProviderFailure('policy-unconfirmed'));
    await expect(runAssetImport({source,...f})).rejects.toBeInstanceOf(ImportStoppedError);
    expect(f.getRecord()?.state).toBe('ambiguous');expect(f.provider.uploadPart).not.toHaveBeenCalled();
    await runAssetImport({source,...f});expect(f.provider.createProtectedUpload).toHaveBeenCalledTimes(1);
  });
  it('reserves before mutation, persists target before bytes and marks ready only after a separate protection check',async()=>{
    const f=fixture();
    vi.mocked(f.provider.createProtectedUpload).mockImplementationOnce(async()=>{
      expect(f.getRecord()?.state).toBe('importing');
      return {assetId:'target',playbackId:'play',uploadId:'session',partSize:5,parts:[{partNumber:1,url:'https://upload.example/1'}]};
    });
    vi.mocked(f.provider.uploadPart).mockImplementationOnce(async()=>{expect(f.getRecord()?.frameworks_asset_id).toBe('target');return 'etag';});
    expect(await runAssetImport({source,...f})).toMatchObject({state:'processing',action:'created'});
    expect(f.getRecord()?.state).toBe('processing');
    expect(await runAssetImport({source,...f,file:undefined})).toMatchObject({state:'ready',action:'polled'});
    expect(f.provider.confirmProtection).toHaveBeenCalledWith('target','play');
    await runAssetImport({source,...f}); expect(f.provider.createProtectedUpload).toHaveBeenCalledTimes(1);
  });
  it.each(['importing','ambiguous','failed','ready'] as const)('never recreates an existing %s import',async(state)=>{
    const f=fixture(state);expect((await runAssetImport({source,...f})).state).toBe(state);
    expect(f.provider.createProtectedUpload).not.toHaveBeenCalled();expect(f.file.verify).not.toHaveBeenCalled();
  });
  it('allows one provider mutation across concurrent workers',async()=>{
    const f=fixture();await Promise.all([runAssetImport({source,...f}),runAssetImport({source,...f})]);
    expect(f.provider.createProtectedUpload).toHaveBeenCalledTimes(1);
  });
  it.each(['createProtectedUpload','uploadPart','complete'] as const)('preserves an ambiguous reservation after %s failure and redacts provider errors',async(method)=>{
    const f=fixture();vi.mocked(f.provider[method]).mockRejectedValueOnce(new Error('https://private.example/?signature=SECRET'));
    await expect(runAssetImport({source,...f})).rejects.toThrow(/^Import stopped with an uncertain outcome/);
    expect(f.getRecord()?.state).toBe('ambiguous');await runAssetImport({source,...f});
    expect(f.provider.createProtectedUpload).toHaveBeenCalledTimes(1);
  });
  it('never completes changed source bytes or a missing ETag',async()=>{
    for(const fault of ['bytes','etag']){
      const f=fixture();if(fault==='bytes') f.file.read.mockImplementation(async(_,n)=>new Uint8Array(n));
      else vi.mocked(f.provider.uploadPart).mockResolvedValue('');
      await expect(runAssetImport({source,...f})).rejects.toThrow(/uncertain/);
      expect(f.provider.complete).not.toHaveBeenCalled();
    }
  });
  it('does not reserve or mutate when source verification fails',async()=>{
    const f=fixture();f.file.verify.mockRejectedValue(new Error('Checksum mismatch'));
    await expect(runAssetImport({source,...f})).rejects.toThrow(/Checksum/);
    expect(f.ledger.reserve).not.toHaveBeenCalled();expect(f.provider.createProtectedUpload).not.toHaveBeenCalled();
  });
  it('refuses changed evidence and failed protection before marking ready',async()=>{
    const f=fixture('processing');
    await expect(runAssetImport({source:{...source,sizeBytes:6},...f})).rejects.toThrow(/evidence/);
    vi.mocked(f.provider.confirmProtection).mockRejectedValue(new Error('Policy unavailable'));
    await expect(runAssetImport({source,...f})).rejects.toThrow(/Policy/);expect(f.getRecord()?.state).toBe('processing');
  });
  it('requires matching target identities and a positive verified duration',async()=>{
    const f=fixture('processing');vi.mocked(f.provider.inspect).mockResolvedValueOnce({assetId:'wrong',playbackId:'play',phase:'ready',durationSeconds:3});
    await expect(runAssetImport({source,...f})).rejects.toThrow(/conflicting/);
    vi.mocked(f.provider.inspect).mockResolvedValueOnce({assetId:'target',playbackId:'play',phase:'ready'});
    expect((await runAssetImport({source,...f})).state).toBe('processing');
  });
});
