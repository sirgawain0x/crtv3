/** @vitest-environment jsdom */
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

const m=vi.hoisted(()=>({publish:vi.fn(),fetch:vi.fn()}));
const eoa='0x'+'a'.repeat(40),sca='0x'+'b'.repeat(40);
vi.mock('@/lib/wallet/react',()=>({useUser:()=>({address:'0x'+'a'.repeat(40)})}));
vi.mock('@/lib/auth/useWalletAuth',()=>({useWalletAuth:()=>({address:'0x'+'b'.repeat(40),getAuthHeaders:async()=>({'X-Wallet-Address':'0x'+'b'.repeat(40),'X-Wallet-Timestamp':'1','X-Wallet-Signature':'signature'})})}));
vi.mock('@/lib/auth/require-wallet',()=>({walletAuthHeadersToArgs:()=>({address:'0x'+'b'.repeat(40),timestamp:1,signature:'signature'})}));
vi.mock('@/services/video-assets',()=>({updateVideoAsset:m.publish}));
vi.mock('@/components/songchain/SongchainShareClipDialog',()=>({SongchainShareClipDialog:()=>null}));
vi.mock('@/components/Player/PreviewPlayer',()=>({PreviewPlayer:()=>null}));
vi.mock('@/lib/hooks/livepeer/useDetailPlaybackSources',()=>({getDetailPlaybackSource:vi.fn()}));
import {ClipCreator} from './ClipCreator';
let root:Root,container:HTMLDivElement;
function button(name:string){const found=Array.from(container.querySelectorAll('button')).find(node=>node.textContent?.trim()===name);if(!found)throw new Error('Missing button '+name);return found;}
async function renderClip(){await act(async()=>root.render(<ClipCreator playbackId="parent" sessionId="session"/>));}
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);container=document.createElement('div');document.body.append(container);root=createRoot(container);vi.stubGlobal('fetch',m.fetch);m.fetch.mockResolvedValueOnce({ok:true,json:async()=>({assetId:'clip',newPlaybackId:'clip-play',playbackUrl:'https://example.test/video.m3u8',parentPlaybackId:'parent'})}).mockResolvedValueOnce({ok:true,json:async()=>({clip:{id:7,title:'Clip'}})});m.publish.mockResolvedValue({id:7});});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();});
describe('verified clip sharing',()=>{
 it('submits the signed smart account and linked EOA, then requires publication before sharing',async()=>{
  await renderClip();await act(async()=>button('Last 15s').click());
  const publish=button('Publish clip');
  expect(JSON.parse(m.fetch.mock.calls[0][1].body)).toMatchObject({clipperAddress:sca,companionAddress:eoa});
  expect(m.fetch.mock.calls[0][1].headers['X-Wallet-Address']).toBe(sca);
  expect(button('Share to Songchain').disabled).toBe(true);
  await act(async()=>publish.click());expect(m.publish).toHaveBeenCalledWith(7,{status:'published'},expect.objectContaining({address:sca}));
  expect(button('Share to Songchain').disabled).toBe(false);
 });
 it('keeps sharing disabled when readiness or publication fails',async()=>{
  m.publish.mockRejectedValue(new Error('Clip processing'));
  await renderClip();await act(async()=>button('Last 15s').click());await act(async()=>button('Publish clip').click());
  expect(container.textContent).toContain('The clip is not ready to publish yet. Retry once processing finishes.');
  expect(button('Share to Songchain').disabled).toBe(true);
 });
});
