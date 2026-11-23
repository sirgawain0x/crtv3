import {afterEach, expect, it, vi} from 'vitest';
import {frameworksHlsDiagnostics} from './hls-diagnostics';

afterEach(()=>vi.restoreAllMocks());
it('reports playlist failure metadata without bearer URLs or response messages',()=>{
  const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
  const events:Record<string,()=>void>={};
  const xhr={status:200,responseType:'',responseText:JSON.stringify({code:'PLAYBACK_ACCESS_DENIED',message:'PRIVATE_BODY'}),responseURL:'https://edge.frameworks.network/hls/video/index.m3u8?fwjwt=PRIVATE_TOKEN',getResponseHeader:()=> 'application/json',addEventListener:(name:string,fn:()=>void)=>{events[name]=fn;}} as unknown as XMLHttpRequest;
  const config=frameworksHlsDiagnostics([{src:'https://foghorn.frameworks.network/play/video/hls/index.m3u8?jwt=PRIVATE_TOKEN',type:'hls',mime:'application/vnd.apple.mpegurl',width:null,height:null}]);
  config?.xhrSetup(xhr,xhr.responseURL);events.load();
  expect(log).toHaveBeenCalledWith(expect.stringContaining('"code":"PLAYBACK_ACCESS_DENIED"'));
  expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE');
});
it('does not change legacy player request configuration',()=>{
  expect(frameworksHlsDiagnostics([{src:'https://example.com/video.m3u8',type:'hls',mime:'application/vnd.apple.mpegurl',width:null,height:null}])).toBeUndefined();
});
