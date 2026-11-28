import { open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { VerifiedImportSource } from './importer';
/** Caller must close the source. No paths or source bytes are persisted in the import ledger. */
export async function openLocalImportSource(path:string):Promise<VerifiedImportSource & {close():Promise<void>}> {
  const handle=await open(path,'r');
  return {
    async verify(source) {
      const stat=await handle.stat();
      if(!stat.isFile() || stat.size!==source.sizeBytes) throw new Error('Local archive source size mismatch');
      const hash=createHash('sha256');const chunk=Buffer.alloc(Math.min(stat.size,1024*1024));
      let offset=0;
      while(offset<stat.size) {
        const {bytesRead}=await handle.read(chunk,0,Math.min(chunk.length,stat.size-offset),offset);
        if(!bytesRead) throw new Error('Local archive source is truncated');
        hash.update(chunk.subarray(0,bytesRead));offset+=bytesRead;
      }
      if(hash.digest('hex')!==source.sha256) throw new Error('Local archive source checksum mismatch');
    },
    async read(offset,length) {
      const chunk=Buffer.alloc(length);let total=0;
      while(total<length) {const {bytesRead}=await handle.read(chunk,total,length-total,offset+total);if(!bytesRead) break;total+=bytesRead;}
      return chunk.subarray(0,total);
    },
    close:()=>handle.close(),
  };
}
