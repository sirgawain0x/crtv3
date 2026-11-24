import type { Src } from '@livepeer/react';
import {inspectHlsManifest} from './hls-manifest';

/** Report playlist structure without logging bearer URLs or provider bodies. */
export function frameworksHlsDiagnostics(sources: Src[]) {
  const frameworks = sources.some(source => {
    try { return new URL(source.src).hostname.endsWith('.frameworks.network'); }
    catch { return false; }
  });
  if (!frameworks) return undefined;
  return {
    xhrSetup(xhr: XMLHttpRequest, url: string) {
      if (!new URL(url).pathname.endsWith('.m3u8')) return;
      for(const event of ['error','timeout'])xhr.addEventListener(event,()=>{
        console.warn('[frameworks] playlist network failure '+JSON.stringify({status:xhr.status,host:new URL(url).hostname,event}));
      });
      xhr.addEventListener('load', () => {
        if (xhr.responseType && xhr.responseType !== 'text') return;
        const body = xhr.responseText.slice(0, 4096);
        const inspected = inspectHlsManifest(body);
        let code = inspected.errorCode;
        try {
          const value = JSON.parse(body).code;
          if (typeof value === 'string' && /^[A-Z_]{1,80}$/.test(value)) code = value;
        } catch { /* Non-JSON responses still have safe HTTP metadata. */ }
        console.warn('[frameworks] playlist response ' + JSON.stringify({
          status: xhr.status,
          host: new URL(xhr.responseURL || url).hostname,
          contentType: xhr.getResponseHeader('content-type')?.split(';')[0] ?? '',
          manifest: inspected.manifest,
          playable: inspected.playable,
          tags: [...new Set(Array.from(body.matchAll(/^#(EXT[A-Z0-9-]+)/gm), match => match[1]))],
          code,
        }));
      });
    },
  };
}
