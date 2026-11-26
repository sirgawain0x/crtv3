import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {secureFrameworksClip,requireReadyFrameworksClip} from './clip-policy';
const request=vi.hoisted(()=>vi.fn());
vi.mock('../frameworks-graphql',()=>({frameworksGraphqlRequest:request}));
const clip={__typename:'Clip',clipHash:'hash',playbackId:'play',status:'ready',playbackPolicy:{type:'JWT',jwt:{allowedKids:['kid'],requiredAudience:['play']}}};
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('FRAMEWORKS_SIGNING_KID','kid');vi.stubEnv('FRAMEWORKS_SIGNING_PRIVATE_KEY','key');request.mockResolvedValue({setPlaybackPolicy:clip});});
afterEach(()=>vi.unstubAllEnvs());
describe('protected clips',()=>{
 it('uses the clip policy target and confirms its identity and exact scope',async()=>{
  await secureFrameworksClip('hash','play');expect(request.mock.calls[0][1].input).toEqual({clipId:'hash',policy:{type:'JWT',jwt:{allowedKids:['kid'],requiredAudience:['play']}}});
 });
 it.each([{...clip,clipHash:'different'},{...clip,playbackPolicy:{type:'PUBLIC'}},{...clip,playbackPolicy:{type:'JWT',jwt:{allowedKids:['kid'],requiredAudience:['other']}}}])('rejects identity or protection mismatch',async result=>{
  request.mockResolvedValue({setPlaybackPolicy:result});await expect(secureFrameworksClip('hash','play')).rejects.toThrow(/did not confirm/);
 });
 it('does not publish a processing clip or policy that cannot be confirmed',async()=>{
  request.mockResolvedValueOnce({clip:{...clip,status:'processing'}});await expect(requireReadyFrameworksClip('hash','play')).rejects.toThrow(/not ready/);
  request.mockResolvedValueOnce({clip}).mockResolvedValueOnce({setPlaybackPolicy:{__typename:'AuthError'}});await expect(requireReadyFrameworksClip('hash','play')).rejects.toThrow(/did not confirm/);
 });
 it.each(['done','ready'])('publishes a completed %s clip only after confirming exact protection',async status=>{
  request.mockResolvedValueOnce({clip:{...clip,status}}).mockResolvedValueOnce({setPlaybackPolicy:clip});
  await expect(requireReadyFrameworksClip('hash','play')).resolves.toBeUndefined();
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[1][1].input.clipId).toBe('hash');
 });
 it.each(['processing','failed','pending','unknown',null])('refuses incomplete or unknown clip status %s before changing policy',async status=>{
  request.mockResolvedValueOnce({clip:{...clip,status}});
  await expect(requireReadyFrameworksClip('hash','play')).rejects.toThrow(/not ready/);
  expect(request).toHaveBeenCalledTimes(1);
 });
});
