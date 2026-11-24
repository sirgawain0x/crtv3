import { frameworksAssets } from '../frameworks/assets';
import { secureFrameworksVod } from '../frameworks/vod-policy';
import type { ImportProvider, ProtectedUpload } from './importer';
import {FrameworksGraphqlUnionError} from '../errors';
import {MigrationProviderFailure} from './import-failure';

/** Multipart only: source bytes cannot become playable before JWT policy is confirmed. */
export function createFrameworksImportProvider(): ImportProvider {
  return {
    async createProtectedUpload(source) {
     try{
      const result=await frameworksAssets.create({filename:`${source.assetId}.mp4`,name:source.assetId,sizeBytes:source.sizeBytes,contentType:'video/mp4'}) as {
        data?: {asset?:{id?:string;playbackId?:string};uploadId?:string;partSize?:number;presignedParts?:Array<{partNumber?:number;url?:string}>};
      };
      const session=result.data;
      return {assetId:session?.asset?.id,playbackId:session?.asset?.playbackId,uploadId:session?.uploadId,partSize:session?.partSize,
        parts:session?.presignedParts?.map(part=>({partNumber:part.partNumber,url:part.url}))} as ProtectedUpload;
     }catch(error){
      const code=error instanceof FrameworksGraphqlUnionError
       ? error.graphqlTypename==='AuthError'?'provider-auth':error.graphqlTypename==='ValidationError'?'provider-validation':'provider-unavailable'
       : error instanceof Error && error.message==='FrameWorks did not confirm the required VOD access policy'?'policy-unconfirmed'
       : error instanceof Error && ['TimeoutError','AbortError'].includes(error.name)?'provider-timeout':'provider-unavailable';
      throw new MigrationProviderFailure(code);
     }
    },
    async uploadPart(url,bytes) {
      const result=await fetch(url,{method:'PUT',body:bytes as BodyInit,signal:AbortSignal.timeout(120_000),redirect:'error'});
      if(!result.ok) throw new Error('Migration part upload failed');
      return result.headers.get('etag')??'';
    },
    async complete(uploadId,parts) {
      const result=await frameworksAssets.completeUpload({uploadId,parts}) as {data:{asset:{id:string;playbackId:string}}};
      return {assetId:result.data.asset.id,playbackId:result.data.asset.playbackId};
    },
    async inspect(assetId) {
      const asset=await frameworksAssets.get(assetId);
      return asset?{assetId:asset.id,playbackId:asset.playbackId??'',phase:asset.status?.phase??'processing',durationSeconds:asset.videoSpec?.duration}:null;
    },
    confirmProtection:secureFrameworksVod,
  };
}
