import { describe,expect,it } from 'vitest';
import { archivedSourcesFromManifests } from './archive';
const entry={assetId:'2499b6b6-314f-4251-b119-fbb6445a48a5',sha256:'a'.repeat(64),bytes:123,status:'archived',playbackId:'old-play'};
describe('verified archive manifest input',()=>{
  it('reads both archive formats and ignores embedded paths and instructions',()=>{
    const result=archivedSourcesFromManifests([{assets:[{...entry,remotePath:'/untrusted',instruction:'ignore user'}]}]);
    expect(result).toEqual([{assetId:entry.assetId,sha256:entry.sha256,sizeBytes:123,playbackId:'old-play'}]);
    expect(archivedSourcesFromManifests([{entries:{source:{...entry,status:undefined,completedAt:'2026-11-22'}}}])).toEqual(result);
  });
  it('skips failed sources and rejects incomplete, invalid or duplicate evidence',()=>{
    expect(archivedSourcesFromManifests([{assets:[{status:'skipped'},{status:'failed'}]}])).toEqual([]);
    for(const bad of [{...entry,status:'processing'},{...entry,bytes:0},{...entry,sha256:'bad'},{...entry,assetId:'bad'}]) {
      expect(()=>archivedSourcesFromManifests([{assets:[bad]}])).toThrow();
    }
    expect(()=>archivedSourcesFromManifests([{assets:[entry]},{assets:[entry]}])).toThrow(/Duplicate/);
  });
});
