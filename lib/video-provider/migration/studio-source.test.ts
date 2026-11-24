import {createHash} from 'node:crypto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createStudioImportSource} from './studio-source';
const bytes=new Uint8Array([1,2,3,4,5]);
const source={assetId:'2499b6b6-314f-4251-b119-fbb6445a48a5',playbackId:'old-play',sizeBytes:5,sha256:createHash('sha256').update(bytes).digest('hex')};
const metadata={id:source.assetId,playbackId:source.playbackId,status:{phase:'ready'},playbackPolicy:{type:'public'},downloadUrl:'https://vod-cdn.lp-playback.studio/source.mp4?signature=private'};
beforeEach(()=>{vi.stubEnv('LIVEPEER_FULL_API_KEY','server-only-key');});afterEach(()=>vi.unstubAllEnvs());
function fixture(asset:unknown=metadata){
 return vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
  if(String(input).startsWith('https://livepeer.studio/'))return Response.json(asset);
  const range=(init?.headers as Record<string,string>).Range.match(/bytes=(\d+)-(\d+)/)!;const start=Number(range[1]),end=Number(range[2]);
  return new Response(bytes.slice(start,end+1),{status:206,headers:{'content-range':`bytes ${start}-${end}/5`,'etag':'"stable"'}});
 });
}
describe('server-side verified Studio source',()=>{
 it('verifies all bytes before returning range reads and keeps credentials off CDN requests',async()=>{
  const fetcher=fixture();const file=createStudioImportSource(fetcher);await file.verify(source);expect(await file.read(1,3)).toEqual(bytes.slice(1,4));
  expect(fetcher.mock.calls[0][1]?.headers).toEqual(expect.objectContaining({Authorization:'Bearer server-only-key'}));
  for(const [,init] of fetcher.mock.calls.slice(1)){expect(init?.headers).not.toHaveProperty('Authorization');expect(init?.redirect).toBe('error');}
  expect(fetcher.mock.calls[2][1]?.headers).toHaveProperty('If-Match','"stable"');
 });
 it.each([{...metadata,downloadUrl:'http://127.0.0.1/private'},{...metadata,downloadUrl:'https://attacker.example/video'}, {...metadata,playbackId:'changed'}, {...metadata,status:{phase:'processing'}}, {...metadata,playbackPolicy:{type:'webhook'}}, {...metadata,playbackPolicy:{type:'jwt'}}])('rejects unsafe origins, changed identities and unreviewed legacy gates before transfer',async(asset)=>{
  const fetcher=fixture(asset);await expect(createStudioImportSource(fetcher).verify(source)).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('rejects changed content and ignored/truncated range responses',async()=>{
  const fetcher=fixture();await expect(createStudioImportSource(fetcher).verify({...source,sha256:'a'.repeat(64)})).rejects.toThrow(/checksum/);
  for(const response of [new Response(bytes),new Response(bytes,{status:206,headers:{'content-range':'bytes 0-4/6'}}),new Response(bytes.slice(0,2),{status:206,headers:{'content-range':'bytes 0-4/5'}})]){
   const bad=fixture();bad.mockImplementationOnce(async()=>Response.json(metadata)).mockImplementationOnce(async()=>response);
   await expect(createStudioImportSource(bad).verify(source)).rejects.toThrow();
  }
 });
});
