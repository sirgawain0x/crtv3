'use client';
import {
  defineChain,
  polygon,
  optimism,
  base,
  zora,
  zoraSepolia,
} from 'thirdweb/chains';
import {
  createWallet,
  inAppWallet,
} from 'thirdweb/wallets';
import {
  generatePayload,
  authedOnly,
  login,
  logout,
} from '@app/api/auth/thirdweb/authentication';
import { useActiveWallet } from 'thirdweb/react';
import { OrbisConnectResult } from '@useorbis/db-sdk';
import { client } from '@app/lib/sdk/thirdweb/client';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { ConnectButton } from '@app/lib/sdk/thirdweb/components';
import { LoginPayload, VerifyLoginPayloadParams } from 'thirdweb/auth';

export default function ConnectButtonWrapper() {
  const { orbisLogin } = useOrbisContext();

  const walletInstance = useActiveWallet();

  const wallets = [
    inAppWallet({
      auth: {
        options: [
          'farcaster',
          'discord',
          'passkey',
          'phone',
          'apple',
          'google',
          'email',
        ],
      },
    }),
    createWallet('io.metamask'),
    createWallet('com.coinbase.wallet'),
    createWallet('global.safe'),
  ];

  const storyTestnet = defineChain(1513);

  const paywallConfig = {
    icon: 'https://storage.unlock-protocol.com/7b2b45eb-ed97-4a1a-b460-b31ce79d087d',
    locks: {
      '0xad597e5b24ad2a6032168c76f49f05d957223cd0': {
        name: 'Annual Creator Pass',
        order: 2,
        network: 137,
        recipient: '',
        dataBuilder: '',
        emailRequired: true,
        maxRecipients: 1,
        skipRecipient: true,
        recurringPayments: 'forever',
      },
      '0xb6b645c3e2025cf69983983266d16a0aa323e2b0': {
        name: 'Creator Pass (3 months)',
        order: 2,
        network: 137,
        recipient: '',
        dataBuilder: '',
        emailRequired: true,
        maxRecipients: 1,
        recurringPayments: 'forever',
      },
    },
    title: 'The Creative Membership',
    referrer: '0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260',
    skipSelect: false,
    hideSoldOut: false,
    pessimistic: true,
    redirectUri: 'https://tv.creativeplatform.xyz',
    messageToSign:
      "Welcome to The Creative, Where Creativity Meets Opportunity!\n\n🌟 Your Creative Space Awaits!\nDive into a world where your art transforms into opportunity. By joining our platform, you're not just accessing tools; you're amplifying your creative voice and reaching audiences who value your work.\n\n🔗 Connect & Collaborate\nEngage with a network of fellow creatives. Share, collaborate, and grow together. Our community thrives on the diversity of its members and the strength of its connections.\n\n💡 Tools for Every Creator\nFrom seamless transactions to intuitive marketing tools, everything you need is right here. Focus on creating—we handle the rest, ensuring your creations are protected and your earnings are secure.\n\n✨ Support on Your Creative Journey\nOur dedicated support team is just a message away, ready to assist you with any questions or to provide guidance as you navigate your creative path.\n\nThank You for Choosing The Creative\nTogether, we’re building a thriving economy of artists, by artists. Let’s create and inspire!",
    skipRecipient: false,
    endingCallToAction: 'Complete Checkout',
    persistentCheckout: false,
  };

  return (
    <ConnectButton
      // autoConnect={false}
      client={client}
      chains={[polygon, base, optimism, storyTestnet, zora, zoraSepolia]}
      connectButton={{
        label: 'Connect Wallet',
        className: 'my-custom-class',
        style: {
          backgroundColor: '#EC407A',
          color: 'white',
          borderRadius: '10px',
        },
      }}
      // accountAbstraction={{
      //   chain: defineChain(polygon),
      //   client: client,
      //   sponsorGas: false,
      //   factoryAddress: `${ACCOUNT_FACTORY_ADDRESS.polygon}`,
      // }}
      wallets={wallets}
      appMetadata={{
        name: 'Creative TV',
        url: 'https://tv.creativeplatform.xyz',
        description: 'The Stage is Yours',
        logoUrl:
          'https://bafybeiesvinhgaqvr62rj77jbwkazg3w6bhcrsfyg6zyozasaud53nucnm.ipfs.w3s.link/Creative%20TV%20Logo.png',
      }}
      walletConnect={{
        projectId: 'dc6a426a325d62879d4b9c6ef6dcedb1',
      }}
      supportedNFTs={{
        137: [
          '0xad597e5b24ad2a6032168c76f49f05d957223cd0',
          '0xb6b645c3e2025cf69983983266d16a0aa323e2b0',
        ],
      }}
      connectModal={{
        size: 'wide',
        privacyPolicyUrl:
          'https://creativeplatform.xyz/docs/legal/privacy-policy',
        termsOfServiceUrl:
          'https://creativeplatform.xyz/docs/legal/terms-conditions',
        welcomeScreen: {
          img: {
            width: 200,
            height: 200,
            src: 'https://bafybeifvsvranpnmujrpcry6lqssxtyfdvqz64gty4vpkhvcncuqd5uimi.ipfs.w3s.link/logo-tv.gif',
          },
          subtitle: 'The Stage is Yours',
          title: 'Welcome to Creative TV',
        },
      }}
      auth={{
        getLoginPayload: async (params: { address: string, chainId: number }) => await generatePayload(params),
        doLogin: async (
          params: VerifyLoginPayloadParams,
        ): Promise<void> => {
          console.log('logging in...');
          
          const loginPayload: LoginPayload | void = await login(params);
          
          console.log({ doLoginResponse: loginPayload });

          const orbisAuthResult: OrbisConnectResult | null = await orbisLogin();

          console.log({ orbisAuthResult });
          
          return loginPayload;
        },
        isLoggedIn: async () => await authedOnly(),
        doLogout: async () => {
          console.log('logging out...');
          await logout();
        },
      }}
      onDisconnect={(params: { account: any, wallet: any }) => params.wallet.disconnect()}
    />
  );
}
