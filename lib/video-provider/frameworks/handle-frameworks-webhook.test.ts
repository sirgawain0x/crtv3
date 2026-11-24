import {beforeEach,describe,expect,it,vi} from 'vitest';
const {get,commit,secure}=vi.hoisted(()=>({get:vi.fn(),commit:vi.fn(),secure:vi.fn()}));
vi.mock('../index',()=>({getVideoProvider:()=>({assets:{get}})}));
vi.mock('./webhook-store',()=>({commitFrameworksWebhook:commit}));
vi.mock('./vod-policy',()=>({secureFrameworksVod:secure}));
import {handleFrameworksWebhookEvent,type FrameworksWebhookEvent} from './handle-frameworks-webhook';
const event=(type:string,data:Record<string,unknown>={}):FrameworksWebhookEvent=>({id:'evt',type,created_at:'2026-11-23T10:00:00Z',data});
const asset={id:'hash',playbackId:'play',status:{phase:'ready'},source:{type:'recording',streamId:'parent'},videoSpec:{duration:12}};
beforeEach(()=>{vi.clearAllMocks();secure.mockResolvedValue(undefined);commit.mockResolvedValue('processed');get.mockResolvedValue(asset);});
describe('durable FrameWorks event dispatch',()=>{
 it.each(['stream.live','stream.idle'])('normalizes %s parent IDs and delegates atomic persistence',async(type)=>{
  const uuid='12345678-abcd-4abc-8def-123456789abc';
  expect(await handleFrameworksWebhookEvent(event(type,{streamId:uuid}))).toBe('processed');
  expect(commit).toHaveBeenCalledWith(expect.objectContaining({streamId:Buffer.from(`Stream:${uuid}`).toString('base64'),payloadSha256:expect.stringMatching(/^[a-f0-9]{64}$/)}));expect(get).not.toHaveBeenCalled();
 });
 it('lets the durable store decide duplicates across instances',async()=>{
  commit.mockResolvedValueOnce('processed').mockResolvedValueOnce('duplicate');const input=event('stream.live',{streamId:'parent'});
  expect(await handleFrameworksWebhookEvent(input)).toBe('processed');expect(await handleFrameworksWebhookEvent(input)).toBe('duplicate');expect(commit).toHaveBeenCalledTimes(2);
 });
 it('records verified canonical recording data, excluding event-supplied owner and URLs',async()=>{
  await handleFrameworksWebhookEvent(event('recording.ready',{artifact:{artifactId:'hash'},creator:'attacker',url:'https://private.example'}));
  expect(commit).toHaveBeenCalledWith(expect.objectContaining({streamId:'parent',artifact:{assetId:'hash',playbackId:'play',durationSeconds:12,policyConfirmed:true}}));
  expect(JSON.stringify(commit.mock.calls[0])).not.toContain('attacker');
  expect(secure).toHaveBeenCalledWith('hash','play');expect(secure.mock.invocationCallOrder[0]).toBeLessThan(commit.mock.invocationCallOrder[0]);
 });
 it('does not acknowledge a recording or create authority until its exact JWT policy is confirmed',async()=>{
  secure.mockRejectedValueOnce(new Error('Policy unavailable'));await expect(handleFrameworksWebhookEvent(event('recording.ready',{artifact:{artifactHash:'hash'}}))).rejects.toThrow('Policy unavailable');expect(commit).not.toHaveBeenCalled();
  await handleFrameworksWebhookEvent(event('recording.ready',{artifact:{artifactHash:'hash'}}));expect(commit).toHaveBeenCalledOnce();
 });
 it.each(['upload.ready','clip.ready'])('stores %s readiness without inventing ownership or publishing',async(type)=>{
  get.mockResolvedValue({...asset,source:{type:'vod'}});await handleFrameworksWebhookEvent(event(type,{artifact:{artifactHash:'hash'}}));expect(commit).toHaveBeenCalled();
 });
 it('does not consume a receipt when provider lookup fails, so a retry can run',async()=>{
  get.mockResolvedValueOnce(null);const input=event('recording.ready',{artifact:{artifactId:'hash'}});
  await expect(handleFrameworksWebhookEvent(input)).rejects.toThrow(/not available/);expect(commit).not.toHaveBeenCalled();
  await handleFrameworksWebhookEvent(input);expect(commit).toHaveBeenCalledTimes(1);
 });
 it.each([undefined,{...asset,status:{phase:'processing'}},{...asset,id:'other'},{...asset,source:{type:'vod'}},{...asset,source:{type:'recording',streamId:'other'}}])('rejects unverified recording data',async(value)=>{
  get.mockResolvedValue(value);await expect(handleFrameworksWebhookEvent(event('recording.ready',{artifact:{artifactHash:'hash'},streamId:'parent'}))).rejects.toThrow();expect(commit).not.toHaveBeenCalled();
 });
 it('rejects business events without source time or required IDs',async()=>{
  await expect(handleFrameworksWebhookEvent({...event('stream.live',{streamId:'parent'}),created_at:undefined})).rejects.toThrow(/timestamp/);
  await expect(handleFrameworksWebhookEvent(event('stream.live'))).rejects.toThrow(/stream ID/);expect(commit).not.toHaveBeenCalled();
 });
 it('accepts signed test probes without provider or database work',async()=>{
  expect(await handleFrameworksWebhookEvent(event('webhook.test'))).toBe('ignored');expect(get).not.toHaveBeenCalled();expect(commit).not.toHaveBeenCalled();
 });
});
