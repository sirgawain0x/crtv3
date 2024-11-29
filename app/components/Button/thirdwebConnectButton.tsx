'use client';
import { ConnectButton } from '@app/lib/sdk/thirdweb/components';
import { client } from '@app/lib/sdk/thirdweb/client';
// import { ACCOUNT_FACTORY_ADDRESS } from '@app/lib/utils/context';
import {
  createWallet,
  inAppWallet,
  // privateKeyToAccount,
} from 'thirdweb/wallets';
import {
  defineChain,
  polygon,
  optimism,
  base,
  zora,
  zoraSepolia,
} from 'thirdweb/chains';
import {
  generatePayload,
  isLoggedIn,
  login,
  logout,
} from '@app/components/Button/actions/thirdwebAuth';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { OrbisConnectResult } from '@useorbis/db-sdk';

export default function ThirdwebConnectButton() {
  const { orbisLogin } = useOrbisContext();

  return (
    <ConnectButton
      client={client}
      auth={{
        isLoggedIn: async (address: string) => {
          console.log("checking if logged in!", { address });
          return await isLoggedIn();
        },
        doLogin: async (params: any) => {
          console.log("logging in!");
          await login(params);
          await orbisLogin();
        },
        getLoginPayload: async ({ address }: { address: string}) => generatePayload({ address }),
        doLogout: async () => {
          console.log("logging out!");
          await logout();
        },
      }}
    />
  )
}