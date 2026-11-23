import {expect,it} from 'vitest';
import {inspectHlsManifest} from './hls-manifest';
it.each([
 ['#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100\nlevel.m3u8',true],
 ['#EXTM3U\n#EXTINF:10,\nsegment.ts',true],
 ['#EXTM3U\n#EXT-X-ENDLIST',false],
 ['<html>not a playlist</html>',false],
])('requires usable HLS entries', (body,playable)=>{
 expect(inspectHlsManifest(body).playable).toBe(playable);
});
it.each([
 ['No HLS compatible tracks found','NO_HLS_TRACKS'],
 ['Not allowed to play (CONN_PLAY)','EDGE_ACCESS_DENIED'],
 ['Stream open failed','STREAM_OPEN_FAILED'],
 ['Stream not active already, aborting','STREAM_UNAVAILABLE'],
 ['Playback start past end of non-live source','PLAYBACK_RANGE_UNAVAILABLE'],
 ['unknown failure','PROVIDER_PLAYLIST_ERROR'],
])('classifies edge failures without exposing details', (reason,code)=>{
 const result=inspectHlsManifest(`#EXTM3U\n#EXT-X-ERROR: ${reason} PRIVATE_URL\n#EXT-X-ENDLIST`);
 expect(result).toEqual({manifest:true,playable:false,errorCode:code});
 expect(JSON.stringify(result)).not.toContain('PRIVATE');
});
