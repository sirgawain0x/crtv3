'use client';
// import {
//   authedOnly,
//   generatePayload,
//   login,
//   logout,
// } from '@app/api/auth/thirdweb/authentication';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { client } from '@app/lib/sdk/thirdweb/client';
import { ConnectButton } from '@app/lib/sdk/thirdweb/components';
import {
  generatePayload,
  login,
  authedOnly,
  logout,
} from '@app/api/auth/thirdweb/authentication';
import { base, baseSepolia, optimism, polygon } from 'thirdweb/chains';
import { useActiveWallet } from 'thirdweb/react';
import { VerifyLoginPayloadParams } from 'thirdweb/auth';
import { createWallet, inAppWallet } from 'thirdweb/wallets';
import { toast } from 'sonner';
import { db } from '@app/lib/sdk/orbisDB/client';

export default function ConnectButtonWrapper() {
  const { orbisLogin } = useOrbisContext();
  const activeWallet = useActiveWallet();

  const wallets = [
    inAppWallet({
      auth: {
        options: [
          'google',
          'discord',
          'telegram',
          'farcaster',
          'email',
          'phone',
          'passkey',
          'guest',
        ],
      },
    }),
    createWallet('io.metamask'),
    createWallet('com.coinbase.wallet'),
  ];

  // const paywallConfig = {
  //   icon: 'https://storage.unlock-protocol.com/7b2b45eb-ed97-4a1a-b460-b31ce79d087d',
  //   locks: {
  //     '0xad597e5b24ad2a6032168c76f49f05d957223cd0': {
  //       name: 'Annual Creator Pass',
  //       order: 2,
  //       network: 137,
  //       recipient: '',
  //       dataBuilder: '',
  //       emailRequired: true,
  //       maxRecipients: 1,
  //       skipRecipient: true,
  //       recurringPayments: 'forever',
  //     },
  //     '0xb6b645c3e2025cf69983983266d16a0aa323e2b0': {
  //       name: 'Creator Pass (3 months)',
  //       order: 2,
  //       network: 137,
  //       recipient: '',
  //       dataBuilder: '',
  //       emailRequired: true,
  //       maxRecipients: 1,
  //       recurringPayments: 'forever',
  //     },
  //   },
  //   title: 'The Creative Membership',
  //   referrer: '0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260',
  //   skipSelect: false,
  //   hideSoldOut: false,
  //   pessimistic: true,
  //   redirectUri: 'https://tv.creativeplatform.xyz',
  //   messageToSign:
  //     "Welcome to The Creative, Where Creativity Meets Opportunity!\n\n🌟 Your Creative Space Awaits!\nDive into a world where your art transforms into opportunity. By joining our platform, you're not just accessing tools; you're amplifying your creative voice and reaching audiences who value your work.\n\n🔗 Connect & Collaborate\nEngage with a network of fellow creatives. Share, collaborate, and grow together. Our community thrives on the diversity of its members and the strength of its connections.\n\n💡 Tools for Every Creator\nFrom seamless transactions to intuitive marketing tools, everything you need is right here. Focus on creating—we handle the rest, ensuring your creations are protected and your earnings are secure.\n\n✨ Support on Your Creative Journey\nOur dedicated support team is just a message away, ready to assist you with any questions or to provide guidance as you navigate your creative path.\n\nThank You for Choosing The Creative\nTogether, we're building a thriving economy of artists, by artists. Let's create and inspire!",
  //   skipRecipient: false,
  //   endingCallToAction: 'Complete Checkout',
  //   persistentCheckout: false,
  // };

  return (
    <ConnectButton
      client={client}
      chains={[base, baseSepolia, optimism, polygon]}
      connectButton={{
        label: 'Get Started',
        className: 'my-custom-class',
        style: {
          backgroundColor: '#EC407A',
          color: 'white',
          borderRadius: '10px',
        },
      }}
      wallets={wallets}
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
        137: [
          '0xad597e5b24ad2a6032168c76f49f05d957223cd0',
          '0xb6b645c3e2025cf69983983266d16a0aa323e2b0',
        ],
        8453: ['0xf7c4cd399395d80f9d61fde833849106775269c6'],
      }}
      auth={{
        getLoginPayload: async ({ address }: { address: string }) =>
          await generatePayload({ address }),
        doLogin: async (params: VerifyLoginPayloadParams) => {
          try {
            // First authenticate with Thirdweb
            await login(params);

            // Wait a bit for the Thirdweb auth to complete
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Then authenticate with Orbis using EVM auth
            const orbisResult = await orbisLogin();
            if (!orbisResult) {
              throw new Error('Failed to login to Orbis');
            }

            // Verify Orbis connection
            const isOrbisConnected = await db.isUserConnected();
            if (!isOrbisConnected) {
              throw new Error('Orbis connection verification failed');
            }

            const currentUser = await db.getConnectedUser();
            console.log('Connected Orbis User:', currentUser);

            toast.success('Successfully authenticated with Orbis');
          } catch (error) {
            console.error('Authentication error:', error);
            toast.error('Failed to complete authentication. Please try again.');
            throw error;
          }
        },
        isLoggedIn: async () => {
          return await authedOnly();
        },
        doLogout: async () => {
          await logout();
        },
      }}
    />
  );
}
