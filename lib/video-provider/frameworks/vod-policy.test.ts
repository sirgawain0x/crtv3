import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {secureFrameworksVod} from './vod-policy';
const fetchMock=vi.fn();
beforeEach(()=>{vi.stubEnv('FRAMEWORKS_API_TOKEN','token');vi.stubEnv('FRAMEWORKS_SIGNING_KID','kid');vi.stubEnv('FRAMEWORKS_SIGNING_PRIVATE_KEY','key');vi.stubGlobal('fetch',fetchMock);});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();fetchMock.mockReset();});
const result={__typename:'VodAsset',artifactHash:'hash',playbackId:'play',playbackPolicy:{type:'JWT',jwt:{allowedKids:['kid'],requiredAudience:['play']}}};
describe('upstream VOD protection',()=>{
 it('requires exact provider-confirmed JWT scope and key',async()=>{
  fetchMock.mockResolvedValue({ok:true,json:async()=>({data:{setPlaybackPolicy:result}})});
  await secureFrameworksVod('hash','play');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables.input).toEqual({vodAssetId:'hash',policy:{type:'JWT',jwt:{allowedKids:['kid'],requiredAudience:['play']}}});
 });
 it.each([{...result,artifactHash:'other'},{...result,playbackPolicy:{type:'PUBLIC'}},{...result,playbackPolicy:{type:'JWT',jwt:{allowedKids:['kid'],requiredAudience:['other']}}},{__typename:'AuthError'}])('fails closed on unconfirmed policy',async(value)=>{
  fetchMock.mockResolvedValue({ok:true,json:async()=>({data:{setPlaybackPolicy:value}})});
  await expect(secureFrameworksVod('hash','play')).rejects.toThrow(/did not confirm/);
 });
 it('checks signing configuration and identities before mutation',async()=>{
  vi.stubEnv('FRAMEWORKS_SIGNING_PRIVATE_KEY','');await expect(secureFrameworksVod('hash','play')).rejects.toThrow(/not configured/);
  await expect(secureFrameworksVod('../hash','play')).rejects.toThrow(/Invalid/);expect(fetchMock).not.toHaveBeenCalled();
 });
});
