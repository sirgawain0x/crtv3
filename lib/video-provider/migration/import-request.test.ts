import {expect,it,vi} from 'vitest';
import {ImportStoppedError} from './import-failure';
import {importFailureCodeFromBody,parseMigrationImportResponse,requestMigrationImport} from './import-request';
import type {ArchivedSource} from './archive';
const source:ArchivedSource={assetId:'11111111-1111-4111-8111-111111111111',playbackId:'old-one',sha256:'a'.repeat(64),sizeBytes:100};
it('recognizes classified import stops in JSON bodies',()=>{
 expect(importFailureCodeFromBody({failureCode:'policy-unconfirmed'})).toBe('policy-unconfirmed');
 expect(importFailureCodeFromBody({failureCode:'bad-code'})).toBeUndefined();
});
it('reconstructs ImportStoppedError from failed admin responses',async()=>{
 const response=new Response(JSON.stringify({error:'Import stopped during protected upload preparation (provider-auth). Inspect its reservation before retrying.',failureCode:'provider-auth'}),{status:409});
 await expect(parseMigrationImportResponse(response)).rejects.toSatisfy((error:unknown)=>{
  expect(error).toBeInstanceOf(ImportStoppedError);
  expect((error as ImportStoppedError).failureCode).toBe('provider-auth');
  return true;
 });
});
it('uses generic operator errors when no stop classification is present',async()=>{
 const response=new Response(JSON.stringify({error:'Migration request failed'}),{status:409});
 await expect(parseMigrationImportResponse(response)).rejects.toThrow('Migration request failed');
});
it('wraps fetch responses through the HTTP helper',async()=>{
 const fetch=vi.fn(async()=>new Response(JSON.stringify({error:'Import stopped during protected upload preparation (policy-unconfirmed). Inspect its reservation before retrying.',failureCode:'policy-unconfirmed'}),{status:409,headers:{'Content-Type':'application/json'}}));
 await expect(requestMigrationImport({mode:'import',source},{fetch,url:'https://staging.example/api/migration/frameworks/import'})).rejects.toBeInstanceOf(ImportStoppedError);
 expect(fetch).toHaveBeenCalledOnce();
});