import {NextResponse} from 'next/server';
import {verifyFrameworksWebhookSignature} from '@/lib/video-provider/frameworks/webhooks';

const STAGING_WEBHOOK='https://staging.tv.creativeplatform.xyz/api/livepeer/webhook';
const EVENTS=new Set(['webhook.test','stream.live','stream.idle','recording.ready','upload.ready','clip.ready']);
const json=(body:unknown,status:number)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});

/** Temporary pre-cutover delivery path. Never writes production data or exposes the bypass credential. */
export async function relayFrameworksWebhookToStaging(rawBody:string,headers:Headers,fetcher:typeof fetch=fetch):Promise<NextResponse|null>{
  if(process.env.VERCEL_ENV!=='production'||process.env.VIDEO_PROVIDER?.trim().toLowerCase()==='frameworks'||!headers.has('webhook-id'))return null;
  if(Buffer.byteLength(rawBody)>256*1024)return json({error:'Webhook body too large'},413);
  const signedHeaders=Object.fromEntries(['webhook-id','webhook-timestamp','webhook-signature'].map(key=>[key,headers.get(key)]));
  if(!verifyFrameworksWebhookSignature(rawBody,signedHeaders))return json({error:'Invalid signature'},401);
  let event:unknown;
  try{event=JSON.parse(rawBody);}catch{return json({error:'Invalid JSON'},400);}
  if(!event||typeof event!=='object'||!('type' in event)||typeof event.type!=='string'||!EVENTS.has(event.type))return new NextResponse(null,{status:204});
  const bypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if(!bypass)return json({error:'Staging webhook delivery unavailable'},503);
  try{
    const response=await fetcher(STAGING_WEBHOOK,{method:'POST',body:rawBody,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{
      'Content-Type':'application/json',
      'webhook-id':signedHeaders['webhook-id']!,
      'webhook-timestamp':signedHeaders['webhook-timestamp']!,
      'webhook-signature':signedHeaders['webhook-signature']!,
      'x-vercel-protection-bypass':bypass,
    }});
    await response.body?.cancel().catch(()=>{});
    return response.ok?json({ok:true,staging:true},200):json({error:'Staging webhook delivery failed'},503);
  }catch{return json({error:'Staging webhook delivery failed'},503);}
}
