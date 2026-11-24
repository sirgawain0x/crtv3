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
 const result=await inspectMigrationReservation(source);expect(result.matchingArtifacts).toEqual([{assetId:'Canonical_Hash',playbackId:'New_Play',sizeMatches:true,status:'processing'}]);expect(result.providerAvailable).toBe(true);expect(JSON.stringify(result)).not.toContain('PRIVATE');
 expect(query).toHaveBeenCalledWith(expect.any(String),{input:{kinds:['VOD'],search:source.assetId,first:10}});
});
it('does not imply absence when a search is truncated or unavailable',async()=>{
 query.mockResolvedValueOnce({storageArtifactsConnection:{totalCount:20,hasNextPage:true,nodes:[]}});expect((await inspectMigrationReservation(source)).completeSearch).toBe(false);
 query.mockRejectedValueOnce(new Error('PRIVATE_URL?token=PRIVATE'));const result=await inspectMigrationReservation(source);expect(result.providerAvailable).toBe(false);expect(result.completeSearch).toBe(false);expect(JSON.stringify(result)).not.toContain('PRIVATE');
});
