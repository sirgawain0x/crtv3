import {afterEach,expect,it,vi} from 'vitest';
const {query}=vi.hoisted(()=>({query:vi.fn()}));
vi.mock('../frameworks-graphql',()=>({frameworksGraphqlRequest:query}));
import {inspectMigrationReservation,webhookSecretFormat} from './inspect-reservation';
const source={assetId:'11111111-1111-4111-8111-111111111111',playbackId:'old-play',sizeBytes:100,sha256:'a'.repeat(64)};
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it('reports malformed configuration without returning the secret or its fingerprint',()=>{
 const secret='whsec_'+Buffer.alloc(32,17).toString('base64');
 expect(webhookSecretFormat(secret)).toBe('valid-base64');expect(webhookSecretFormat('"'+secret+'"')).toBe('quoted');expect(webhookSecretFormat('')).toBe('missing');expect(webhookSecretFormat('invalid!')).toBe('invalid');
});
it('returns only exact source matches and safe canonical identities',async()=>{
 query.mockResolvedValue({storageArtifactsConnection:{totalCount:2,hasNextPage:false,nodes:[{hash:'Canonical_Hash',playbackId:'New_Play',title:source.assetId,status:'PROCESSING',sizeBytes:100,url:'PRIVATE_URL'},{hash:'Other_Hash',playbackId:'Other_Play',title:'other',status:'ready',sizeBytes:100}]}});
 const result=await inspectMigrationReservation(source);expect(result.matchingArtifacts).toEqual([{assetId:'Canonical_Hash',playbackId:'New_Play',identityUsable:true,sizeMatches:true,status:'processing'}]);expect(result.providerAvailable).toBe(true);expect(JSON.stringify(result)).not.toContain('PRIVATE');
 expect(query).toHaveBeenCalledWith(expect.any(String),{input:{kinds:['VOD'],search:source.assetId,first:10}});
});
it('retains unfinished matches with missing identities without misreporting an outage or leaking invalid values',async()=>{
 query.mockResolvedValue({storageArtifactsConnection:{totalCount:1,hasNextPage:false,nodes:[{hash:'https://PRIVATE',playbackId:null,title:source.assetId,status:'processing',sizeBytes:100}]}});
 const result=await inspectMigrationReservation(source);expect(result.providerAvailable).toBe(true);expect(result.completeSearch).toBe(true);expect(result.matchingArtifacts).toEqual([{assetId:null,playbackId:null,identityUsable:false,incomplete:true,unusableReason:'missing_hash',sizeMatches:true,status:'processing'}]);expect(JSON.stringify(result)).not.toContain('PRIVATE');
});
it('does not imply absence when a search is truncated or unavailable',async()=>{
 query.mockResolvedValueOnce({storageArtifactsConnection:{totalCount:20,hasNextPage:true,nodes:[]}});expect((await inspectMigrationReservation(source)).completeSearch).toBe(false);
 query.mockRejectedValueOnce(new Error('PRIVATE_URL?token=PRIVATE'));const result=await inspectMigrationReservation(source);expect(result.providerAvailable).toBe(false);expect(result.completeSearch).toBe(false);expect(JSON.stringify(result)).not.toContain('PRIVATE');
});
it('flags title matches with missing playback id without implying provider outage',async()=>{
 query.mockResolvedValue({storageArtifactsConnection:{totalCount:1,hasNextPage:false,nodes:[{hash:'Canonical_Hash',playbackId:null,title:source.assetId,status:'ready',sizeBytes:100}]}});
 const result=await inspectMigrationReservation(source);
 expect(result.providerAvailable).toBe(true);expect(result.matchingArtifacts).toEqual([{assetId:'Canonical_Hash',playbackId:null,identityUsable:false,incomplete:true,unusableReason:'missing_playback_id',sizeMatches:true,status:'ready'}]);
});
it('flags title matches with invalid hash without implying provider outage',async()=>{
 query.mockResolvedValue({storageArtifactsConnection:{totalCount:1,hasNextPage:false,nodes:[{hash:'!!!',playbackId:'New_Play',title:source.assetId,status:'processing',sizeBytes:50}]}});
 const result=await inspectMigrationReservation(source);
 expect(result.providerAvailable).toBe(true);expect(result.matchingArtifacts).toEqual([{assetId:null,playbackId:'New_Play',identityUsable:false,incomplete:true,unusableReason:'missing_hash',sizeMatches:false,status:'processing'}]);
});
it('returns complete and incomplete title matches together',async()=>{
 query.mockResolvedValue({storageArtifactsConnection:{totalCount:2,hasNextPage:false,nodes:[
  {hash:'Canonical_Hash',playbackId:'New_Play',title:source.assetId,status:'ready',sizeBytes:100},
  {hash:'Canonical_Hash',playbackId:null,title:source.assetId,status:'processing',sizeBytes:100},
 ]}});
 const result=await inspectMigrationReservation(source);
 expect(result.providerAvailable).toBe(true);expect(result.matchingArtifacts).toEqual([
  {assetId:'Canonical_Hash',playbackId:'New_Play',identityUsable:true,sizeMatches:true,status:'ready'},
  {assetId:'Canonical_Hash',playbackId:null,identityUsable:false,incomplete:true,unusableReason:'missing_playback_id',sizeMatches:true,status:'processing'},
 ]);
});