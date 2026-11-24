import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {proxy} from './proxy';
const qa='https://zxpobpucayevlrzdxhmr.supabase.co';
const origin='https://staging.tv.creativeplatform.xyz';
const request=(from=origin,path='/api/livepeer/livepeer-proxy',method='POST')=>new NextRequest('https://staging.tv.creativeplatform.xyz'+path,{method,headers:{Origin:from}});
beforeEach(()=>{vi.stubEnv('NODE_ENV','production');vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL',qa);});afterEach(()=>vi.unstubAllEnvs());
describe('isolated staging API origin',()=>{
 it('allows same-origin staging requests with the isolated QA database',()=>{
  const response=proxy(request());expect(response.status).toBe(200);expect(response.headers.get('access-control-allow-origin')).toBe(origin);expect(response.headers.get('access-control-allow-credentials')).toBe('true');
 });
 it('denies staging credentials on production and preview deployments using production data',()=>{
  vi.stubEnv('VERCEL_ENV','production');expect(proxy(request()).status).toBe(400);
  vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://zdeiezfoemibjgrkyzvs.supabase.co');expect(proxy(request()).status).toBe(400);
 });
 it.each(['https://attacker.example','https://staging.tv.creativeplatform.xyz.attacker.example','https://arbitrary.vercel.app'])('does not reflect an arbitrary credentialed origin: %s',from=>{
  expect(proxy(request(from)).status).toBe(400);
 });
 it('retains the canonical production origin and isolated QA preflight',()=>{
  expect(proxy(request('https://tv.creativeplatform.xyz')).status).toBe(200);
  const response=proxy(request(origin,'/api/migration/frameworks/import','OPTIONS'));expect(response.status).toBe(200);expect(response.headers.get('access-control-allow-origin')).toBe(origin);
 });
 it('keeps the existing paid API CORS boundary independent of cookie credentials',()=>{
  const response=proxy(request('https://external-agent.example','/api/market/tokens','GET'));expect(response.status).toBe(200);expect(response.headers.get('access-control-allow-origin')).toBe('*');expect(response.headers.has('access-control-allow-credentials')).toBe(false);
 });
});
