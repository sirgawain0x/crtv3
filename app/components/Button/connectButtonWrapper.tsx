'use client';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { client } from '@app/lib/sdk/thirdweb/client';
import { ConnectButton } from '@app/lib/sdk/thirdweb/components';
import {
  generatePayload,
  login,
  authedOnly,
  logout,
} from '@app/api/auth/thirdweb/authentication';
import { base } from 'thirdweb/chains';
import { VerifyLoginPayloadParams } from 'thirdweb/auth';
import { createWallet, inAppWallet } from 'thirdweb/wallets';
import { toast } from 'sonner';
import { db } from '@app/lib/sdk/orbisDB/client';
import { decodeJWT } from 'thirdweb/utils';
import { checkForBinaryData } from '@app/lib/utils/jwt-debug';

export default function ConnectButtonWrapper() {
  const { orbisLogin } = useOrbisContext();
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
      chain={base}
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
        getLoginPayload: async ({ address }: { address: string }) =>
          await generatePayload({ address }),
        doLogin: async (params: VerifyLoginPayloadParams) => {
          try {
            console.log('Starting authentication process');

            // First authenticate with Thirdweb
            console.log('Authenticating with Thirdweb');
            await login(params);
            console.log('Thirdweb authentication successful');

            // Get the JWT from cookies for debugging
            try {
              const cookies = document.cookie.split(';').reduce(
                (acc, cookie) => {
                  const [key, value] = cookie.trim().split('=');
                  acc[key] = value;
                  return acc;
                },
                {} as Record<string, string>,
              );

              if (cookies.jwt) {
                console.log('JWT found in cookies, analyzing...');
                const { payload, signature } = decodeJWT(cookies.jwt);
                console.log('JWT payload:', payload);

                // Check for binary data in the payload
                const binaryCheck = checkForBinaryData(payload);
                if (binaryCheck.hasBinaryData) {
                  console.warn(
                    'Binary data found in JWT payload:',
                    binaryCheck.paths,
                  );
                }
              }
            } catch (jwtError) {
              console.error('Error analyzing JWT:', jwtError);
            }

            // Wait a bit for the Thirdweb auth to complete
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Then authenticate with Orbis using EVM auth
            console.log('Starting Orbis authentication');
            const orbisResult = await orbisLogin();
            if (!orbisResult) {
              console.error('Orbis login returned null result');
              throw new Error('Failed to login to Orbis');
            }
            console.log('Orbis login successful, verifying connection');

            // Verify Orbis connection
            const isOrbisConnected = await db.isUserConnected();
            console.log('Orbis connection status:', isOrbisConnected);
            if (!isOrbisConnected) {
              console.error('Orbis connection verification failed');
              throw new Error('Orbis connection verification failed');
            }

            const currentUser = await db.getConnectedUser();
            console.log('Connected Orbis User:', currentUser);

            toast.success('Successfully authenticated with Orbis');
          } catch (error) {
            console.error('Authentication error:', error);
            // Log more details about the error
            if (error instanceof Error) {
              console.error('Error name:', error.name);
              console.error('Error message:', error.message);
              console.error('Error stack:', error.stack);
            } else {
              console.error('Unknown error type:', typeof error);
            }
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
