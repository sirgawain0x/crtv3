import {afterEach,describe,it,expect,vi} from 'vitest';
import {hasLivepeerPrivateApiKey,resolveLivepeerStudioAuthToken} from './studioAuth';
import {getFullLivepeer} from './fullClient';
afterEach(()=>vi.unstubAllEnvs());
describe('FrameWorks-only runtime boundary',()=>{
 it('disables the legacy credential and SDK paths even if old credentials remain configured',()=>{
  vi.stubEnv('LIVEPEER_FULL_API_KEY','existing-server-key');vi.stubEnv('VIDEO_PROVIDER','livepeer');
  expect(resolveLivepeerStudioAuthToken()).toBe('existing-server-key');expect(getFullLivepeer()).not.toBeNull();
  vi.stubEnv('VIDEO_PROVIDER','frameworks');
  expect(resolveLivepeerStudioAuthToken()).toBeUndefined();expect(hasLivepeerPrivateApiKey()).toBe(false);expect(getFullLivepeer()).toBeNull();
 });
});
