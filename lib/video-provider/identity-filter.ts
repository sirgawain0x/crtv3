import { resolveVideoProviderId } from './config';
import { isVideoAssetId } from './asset-id';
/** Legacy UUIDs are case-insensitive; opaque FrameWorks hashes retain their exact case. */
export function normalizeVideoIdentity(value:string):string {
  const raw=value.trim();
  if(!isVideoAssetId(raw))throw new Error('Invalid video identity');
  return /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(raw)?raw.toLowerCase():raw;
}
/** Only the FrameWorks schema uses legacy aliases; production Livepeer queries need no new columns. */
export function filterVideoIdentity<T>(query:T,field:'asset_id'|'playback_id',value:string):T {
  const identity=normalizeVideoIdentity(value);
  const builder=query as {eq(column:string,value:string):T;or(filters:string):T};
  return resolveVideoProviderId()==='frameworks'
    ?builder.or(`${field}.eq.${identity},livepeer_${field}.eq.${identity}`)
    :builder.eq(field,identity);
}
