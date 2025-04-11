'use client';
import { useOrbis } from '@app/lib/sdk/orbisDB/simplified-provider';
import { client } from '@app/lib/sdk/thirdweb/client';
import { ConnectButton } from '@app/lib/sdk/thirdweb/components';
import { base } from 'thirdweb/chains';
import { createWallet, inAppWallet } from 'thirdweb/wallets';
import { AuthService } from '@app/lib/services/auth';
import { useRouter } from 'next/navigation';
import type { LoginPayload } from 'thirdweb/auth';
import { useAuth } from '@app/hooks/useAuth';

export default function ConnectButtonWrapper() {
  const { orbisLogin } = useOrbis();
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuth();

  // Configure inAppWallet with SIWE and other auth methods
  const inAppWalletConfig = inAppWallet({
    auth: {
      options: [
        'google',
        'discord',
        'telegram',
        'farcaster',
        'email',
        'x',
        'phone',
        'passkey',
        'guest',
        'wallet',
      ],
      mode: 'popup',
    },
    metadata: {
      image: {
        src: 'https://bafybeiesvinhgaqvr62rj77jbwkazg3w6bhcrsfyg6zyozasaud53nucnm.ipfs.w3s.link/Creative%20TV%20Logo.png',
        alt: 'Creative TV Logo',
        width: 100,
        height: 100,
      },
    },
    hidePrivateKeyExport: true,
  });

  // Configure additional wallets for SIWE
  const wallets = [
    inAppWalletConfig,
    createWallet('walletConnect'),
    createWallet('io.metamask'),
    createWallet('com.coinbase.wallet'),
  ];

  return (
    <ConnectButton
      client={client}
      chain={base}
      connectButton={{
        label: isAuthenticated ? undefined : 'Get Started',
        className:
          'my-custom-class text-sm sm:text-base px-3 py-1 sm:px-4 sm:py-2',
        style: {
          backgroundColor: '#EC407A',
          color: 'white',
          borderRadius: '10px',
        },
      }}
      wallets={wallets}
      connectModal={{ size: 'wide' }}
      accountAbstraction={{
        chain: base,
        sponsorGas: false,
      }}
      appMetadata={{
        name: 'Creative TV',
        url: 'https://tv.creativeplatform.xyz',
        description: 'The Stage is Yours',
        logoUrl:
          'https://bafybeiesvinhgaqvr62rj77jbwkazg3w6bhcrsfyg6zyozasaud53nucnm.ipfs.w3s.link/Creative%20TV%20Logo.png',
      }}
      walletConnect={{
        projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
      }}
      supportedNFTs={{
        8453: [
          '0xf7c4cd399395d80f9d61fde833849106775269c6',
          '0x13b818daf7016b302383737ba60c3a39fef231cf',
          '0x9c3744c96200a52d05a630d4aec0db707d7509be',
        ],
      }}
      supportedTokens={{
        8453: [
          {
            address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
            name: 'Dai Stablecoin',
            symbol: 'DAI',
            icon: '/dai-logo.svg',
          },
          {
            address: '0x4b62d9b3de9fab98659693c9ee488d2e4ee56c44',
            name: 'Creative Token',
            symbol: 'CRTV',
            icon: '/CRTV-token_logo.png',
          },
        ],
      }}
      auth={{
        async doLogin(params) {
          try {
            // First connect with Orbis
            const orbisResult = await AuthService.connectWithOrbis();
            if (!orbisResult) {
              throw new Error('Failed to connect with Orbis');
            }

            // Then perform login
            const loginResult = await AuthService.login();
            if (!loginResult.success) {
              throw new Error(loginResult.message || 'Login failed');
            }

            await checkAuth();
            router.refresh();
          } catch (error) {
            console.error('Login error:', error);
            throw error;
          }
        },
        async doLogout() {
          try {
            const result = await AuthService.logout();
            if (!result.success) {
              throw new Error(result.message || 'Logout failed');
            }

            await checkAuth();
            router.refresh();
          } catch (error) {
            console.error('Logout error:', error);
            throw error;
          }
        },
        async getLoginPayload({ address, chainId }): Promise<LoginPayload> {
          try {
            const domain = window.location.host;
            const nonce = Date.now().toString();
            const statement =
              'Welcome to Creative TV! Sign this message to authenticate.';
            const now = new Date();
            const issuedAt = now.toISOString();

            return {
              domain,
              address,
              statement,
              uri: window.location.origin,
              version: '1',
              chain_id: chainId.toString(),
              nonce,
              issued_at: issuedAt,
              invalid_before: issuedAt,
              expiration_time: new Date(
                now.getTime() + 1000 * 60 * 60 * 24,
              ).toISOString(),
              resources: [`${window.location.origin}/*`],
            };
          } catch (error) {
            console.error('Error generating login payload:', error);
            throw error;
          }
        },
        async isLoggedIn(address) {
          try {
            const authStatus = await AuthService.checkAuthStatus();
            return authStatus.success && authStatus.data?.isAuthenticated;
          } catch (error) {
            console.error('Error checking login status:', error);
            return false;
          }
        },
      }}
    />
  );
}
