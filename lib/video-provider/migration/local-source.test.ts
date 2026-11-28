import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {openLocalImportSource} from './local-source';
it('verifies full local content and reads bounded parts without trusting filename or size alone',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'frameworks-source-test-'));const path=join(dir,'video.mp4');
 const bytes=Buffer.from([1,2,3,4,5]);await writeFile(path,bytes,{mode:0o600});const file=await openLocalImportSource(path);
 const source={assetId:'2499b6b6-314f-4251-b119-fbb6445a48a5',playbackId:null,sizeBytes:5,sha256:createHash('sha256').update(bytes).digest('hex')};
 try{
  await file.verify(source);expect(await file.read(2,3)).toEqual(bytes.subarray(2));
  await expect(file.verify({...source,sizeBytes:6})).rejects.toThrow(/size/);
  await writeFile(path,Buffer.from([5,4,3,2,1]));await expect(file.verify(source)).rejects.toThrow(/checksum/);
 }finally{await file.close();await rm(dir,{recursive:true,force:true});}
});
