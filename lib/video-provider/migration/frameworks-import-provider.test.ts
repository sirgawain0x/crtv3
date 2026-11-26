import {expect,it,vi} from 'vitest';
const {create}=vi.hoisted(()=>({create:vi.fn()}));
vi.mock('../frameworks/assets',()=>({frameworksAssets:{create}}));
import {FrameworksGraphqlUnionError} from '../errors';
import {createFrameworksImportProvider} from './frameworks-import-provider';
import {MigrationProviderFailure} from './import-failure';
const source={assetId:'11111111-1111-4111-8111-111111111111',playbackId:'old-play',sizeBytes:100,sha256:'a'.repeat(64)};
it.each([
 [new FrameworksGraphqlUnionError('AuthError','PRIVATE_URL'), 'provider-auth'],
 [new FrameworksGraphqlUnionError('ValidationError','PRIVATE_URL'), 'provider-validation'],
 [new Error('FrameWorks did not confirm the required VOD access policy'),'policy-unconfirmed'],
 [Object.assign(new Error('PRIVATE_URL'),{name:'TimeoutError'}),'provider-timeout'],
 [new Error('PRIVATE_URL'),'provider-unavailable'],
])('classifies protected-upload failures without leaking provider details',async(error,code)=>{
 create.mockRejectedValueOnce(error);
 try{await createFrameworksImportProvider().createProtectedUpload(source);throw new Error('Expected failure');}
 catch(failure){expect(failure).toBeInstanceOf(MigrationProviderFailure);expect((failure as MigrationProviderFailure).failureCode).toBe(code);expect(String(failure)).not.toContain('PRIVATE');}
});
