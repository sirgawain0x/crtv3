// "use client";
// import type { NextPage } from "next";
// import { ConnectButton } from "thirdweb/react";
// import { client } from "../../lib/sdk/thirdweb/client";
// import { generatePayload, isLoggedIn, login, logout } from "../../api/auth/thirdweb/auth";
// import { useOrbisContext } from "@app/lib/sdk/orbisDB/context";

// const CRTVConnectButton = () => {
//   const { orbisLogin } = useOrbisContext();
  
//   return (
//     <ConnectButton
//       client={client}
//       auth={{
//         isLoggedIn: async (address: string) => {
//           console.log("checking if logged in!", { address });
//           return await isLoggedIn(address);
//         },
//         doLogin: async (params: any) => {
//           console.log("logging in!");
//           await orbisLogin(params);
//           await login(params);
//         },
//         getLoginPayload: async ({ address }: { address: string }) => generatePayload({ address }),
//         doLogout: async () => {
//           console.log("logging out!");
//           await logout();
//         },
//       }}
//     />
//   );
// };

// export default CRTVConnectButton;

// CRTVConnectButton.tsx
"use client";

import {
  useActiveAccount,
  useActiveWalletChain,
} from "thirdweb/react";
import { generatePayload, login } from "@app/components/Button/actions/login"; // we'll add this file in the next section
import { signLoginPayload } from "thirdweb/auth";
import { createWallet } from "thirdweb/wallets";
import { useConnect } from "thirdweb/react"
import { client } from "@app/lib/sdk/thirdweb/client";
import { useOrbisContext } from "@app/lib/sdk/orbisDB/context";

export const CRTVConnectButton = () => {
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const { connect, isConnecting, error } = useConnect();

  const { orbisLogin } = useOrbisContext();
  
  async function handleClick() {

    // console.log({ account, chain });

    let activeAccount;

    if (!account) {
      const wallet = await connect(async () => {
        const wallet = createWallet("io.metamask"); // update this to your wallet of choice or create a custom UI to select wallets
        await wallet.connect({
          client,
        });
        return wallet;
      });
      activeAccount = wallet.getAccount();
    } else {
      activeAccount = account;
    }

    console.log('activeAccount', activeAccount);

    // Step 1: fetch the payload from the server
    const payload = await generatePayload({
      address: activeAccount.address,
      chainId: 137 // chain.id,
    });

    // console.log({ payload });

    // Step 2: Sign the payload
    const signatureResult = await signLoginPayload({
      payload,
      account: activeAccount,
    });

    // console.log({ signatureResult });

    // Step 3: Send the signature to the server for verification
    const finalResult = await login(signatureResult);

    // console.log({ finalResult });

    if (finalResult.valid) {
      await orbisLogin();
    }

    // alert(finalResult.valid ? "Login successful" : "Login failed");
  }

  return (
    <button onClick={handleClick}>
      Login
    </button>
  );
};

export default CRTVConnectButton;
