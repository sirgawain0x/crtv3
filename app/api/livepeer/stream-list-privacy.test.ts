import {afterEach,it,expect,vi} from 'vitest';
import {GET} from './route';
afterEach(()=>vi.unstubAllGlobals());
it('does not expose a raw provider stream list or fetch ingest credentials',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const response=await GET();expect(response.status).toBe(405);expect(fetcher).not.toHaveBeenCalled();
 expect(await response.json()).toEqual({error:'Method not allowed'});
});
