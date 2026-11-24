import {createHmac} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {relayFrameworksWebhookToStaging} from './frameworks-staging-relay';
const secret=Buffer.from('ephemeral-test-secret');
const body=JSON.stringify({id:'test-event',type:'webhook.test'});
function signed(value=body,age=0){const id='message',ts=String(Math.floor(Date.now()/1000)+age);return new Headers({'webhook-id':id,'webhook-timestamp':ts,'webhook-signature':'v1,'+createHmac('sha256',secret).update(`${id}.${ts}.${value}`).digest('base64')});}
beforeEach(()=>{vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('VIDEO_PROVIDER','livepeer');vi.stubEnv('FRAMEWORKS_WEBHOOK_SECRET','whsec_'+secret.toString('base64'));vi.stubEnv('VERCEL_AUTOMATION_BYPASS_SECRET','PRIVATE_BYPASS');});
afterEach(()=>vi.unstubAllEnvs());
it('forwards only a valid signed body to the fixed QA route with private header credentials',async()=>{
 const fetcher=vi.fn(async()=>new Response(null,{status:204}));const headers=signed();
 const result=await relayFrameworksWebhookToStaging(body,headers,fetcher);expect(result?.status).toBe(200);
 expect(fetcher).toHaveBeenCalledWith('https://staging.tv.creativeplatform.xyz/api/livepeer/webhook',expect.objectContaining({body,redirect:'error',headers:expect.objectContaining({'webhook-signature':headers.get('webhook-signature'),'x-vercel-protection-bypass':'PRIVATE_BYPASS'})}));
 expect(JSON.stringify(await result?.json())).not.toContain('PRIVATE');
});
it.each([['VERCEL_ENV','preview'],['VIDEO_PROVIDER','frameworks']])('never relays in %s=%s',async(key,value)=>{
 vi.stubEnv(key,value);const fetcher=vi.fn();expect(await relayFrameworksWebhookToStaging(body,signed(),fetcher)).toBeNull();expect(fetcher).not.toHaveBeenCalled();
});
it('leaves ordinary legacy delivery on its existing handler',async()=>{expect(await relayFrameworksWebhookToStaging(body,new Headers(),vi.fn())).toBeNull();});
it.each([['tampered',0],['expired',-301],['future',301]])('rejects %s signed events before any external request',async(kind,age)=>{
 const fetcher=vi.fn();const result=await relayFrameworksWebhookToStaging(kind==='tampered'?body+'\n':body,signed(body,age),fetcher);expect(result?.status).toBe(401);expect(fetcher).not.toHaveBeenCalled();
});
it('never acknowledges failed delivery or exposes response bodies, URLs or credentials',async()=>{
 const failed=vi.fn(async()=>new Response('PRIVATE_RESPONSE',{status:401}));let result=await relayFrameworksWebhookToStaging(body,signed(),failed);
 expect(result?.status).toBe(503);expect(JSON.stringify(await result?.json())).not.toContain('PRIVATE');
 vi.stubEnv('VERCEL_AUTOMATION_BYPASS_SECRET','');result=await relayFrameworksWebhookToStaging(body,signed(),failed);expect(result?.status).toBe(503);expect(failed).toHaveBeenCalledTimes(1);
});
