"use client";

import {
  useActiveAccount,
  useActiveWalletChain,
} from "thirdweb/react";
import { generatePayload, login, isLoggedIn, logout } from "@app/components/Button/actions/login"; // we'll add this file in the next section
import { signLoginPayload } from "thirdweb/auth";
import { createWallet } from "thirdweb/wallets";
import { useConnect } from "thirdweb/react"
import { client } from "@app/lib/sdk/thirdweb/client";
import { useOrbisContext } from "@app/lib/sdk/orbisDB/context";
import { Button } from "@chakra-ui/react"
import React, { useEffect, useState } from "react";

// interface CRTVConnectButtonProps {
//   onLoginLogout: () => Promise<void>;
// }

const CRTVConnectButton: React.FC</* CRTVConnectButtonProps */any> = (/* {  
  onLoginLogout: () => Promise<void>
} */) => {
  const [isActivelyLoggedIn, setIsLoggedIn] = useState(false);
  
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const { connect, isConnecting, error } = useConnect();

  const { orbisLogin } = useOrbisContext();

  useEffect(() => {
    const checkIfLoggedIn = async () => {
      const loggedIn = await isLoggedIn();
      if (loggedIn) {
        setIsLoggedIn(true);
      }
    }
    checkIfLoggedIn();
  }, []);
  
  async function handleClick() {

    if ( !isActivelyLoggedIn ) {
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
        const orbisDBAuthResult = await orbisLogin();
        console.log({ orbisDBAuthResult });
        setIsLoggedIn(true);
      }

      // alert(finalResult.valid ? "Login successful" : "Login failed");
    }
  }

  async function handleLogout() {
    await logout();
    // onLoginLogout();
    setIsLoggedIn(false);
  }

  return !isActivelyLoggedIn ? (
      <Button 
        colorScheme="pink"
        className="flex items-center space-x-2 rounded-full bg-pink-500 px-6 py-2 text-lg font-normal text-white transition duration-200 hover:bg-pink-600 lg:py-3"
        onClick={handleClick}
      >
        Connect Wallet
      </Button>
    ) : (
      <Button 
        colorScheme="grey" 
        className="flex items-center space-x-2 rounded-full bg-grey-500 px-6 py-2 text-lg font-normal text-white-500 transition duration-200 hover:bg-grey-600 lg:py-3"
        variant="solid" 
        onClick={handleLogout}
      >
        Disconnect
      </Button>
    );
};

export default CRTVConnectButton;
