/** @vitest-environment jsdom */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,describe,expect,it,vi} from 'vitest';
const {admin,signer}=vi.hoisted(()=>({admin:vi.fn(),signer:vi.fn()}));
vi.mock('@/lib/hooks/admin/usePlatformAdmin',()=>({usePlatformAdmin:admin}));
vi.mock('@/lib/hooks/admin/usePlatformAdminWalletAuth',()=>({usePlatformAdminWalletAuth:signer}));
import Operator from './operator';
beforeEach(()=>{vi.clearAllMocks();signer.mockReturnValue({getAuthHeaders:vi.fn(),isReady:true});});
describe('migration operator admin identity',()=>{
 it.each(['resolved-admin-eoa','resolved-admin-smart-account'])('uses the resolved %s for signing rather than a generic connected account',address=>{
  admin.mockReturnValue({adminAuthAddress:address,isAdmin:true});const html=renderToStaticMarkup(<Operator/>);
  expect(signer).toHaveBeenCalledWith(address);expect(html).toContain('Import verified source');expect(html).toContain('Poll existing import');
 });
 it('does not expose controls to a non-admin session',()=>{
  admin.mockReturnValue({adminAuthAddress:null,isAdmin:false});const html=renderToStaticMarkup(<Operator/>);
  expect(html).toContain('Sign in with the platform admin wallet');expect(html).not.toContain('Import verified source');
 });
});
