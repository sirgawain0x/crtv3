import {beforeEach,describe,it,expect,vi} from 'vitest';
const {lookup,graphql}=vi.hoisted(()=>({lookup:vi.fn(),graphql:vi.fn()}));
vi.mock('@/lib/sdk/supabase/service',()=>({createServiceClient:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:lookup})})})})}));
vi.mock('../frameworks-graphql',()=>({frameworksGraphqlRequest:graphql}));
import {getFrameworksViewerCount} from './viewers';
beforeEach(()=>vi.clearAllMocks());
describe('FrameWorks real-time viewership',()=>{
 it('queries the saved FrameWorks channel and returns its actual count',async()=>{lookup.mockResolvedValue({data:{stream_id:'saved-node'},error:null});graphql.mockResolvedValue({stream:{metrics:{currentViewers:3}}});expect(await getFrameworksViewerCount('playback')).toBe(3);expect(graphql).toHaveBeenCalledWith(expect.stringContaining('currentViewers'),{id:'saved-node'});});
 it('does not invent zero viewers for unknown channels or absent metrics',async()=>{lookup.mockResolvedValue({data:null,error:null});expect(await getFrameworksViewerCount('unknown')).toBeNull();expect(graphql).not.toHaveBeenCalled();lookup.mockResolvedValue({data:{stream_id:'saved-node'},error:null});graphql.mockResolvedValue({stream:{metrics:null}});expect(await getFrameworksViewerCount('known')).toBeNull();});
 it('retains a genuine zero count',async()=>{lookup.mockResolvedValue({data:{stream_id:'saved-node'},error:null});graphql.mockResolvedValue({stream:{metrics:{currentViewers:0}}});expect(await getFrameworksViewerCount('idle')).toBe(0);});
});
