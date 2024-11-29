"use client";

import { useActiveAccount } from "thirdweb/react";
import { authedOnly, generatePayload, login, logout } from "@app/components/Button/actions/auth";
import { signLoginPayload } from "thirdweb/auth";
import { client } from "@app/lib/sdk/thirdweb/client";
import { ConnectButton } from "thirdweb/react";
import { useEffect } from "react";

export const CrtvJwtConnectButton: React.FC = () => {
  const account = useActiveAccount();
  
  async function handleClick() {
    if (!account) {
      return alert("Please connect your wallet");
    }
    // Step 1: Generate the payload
    const payload = await generatePayload({ address: account.address });
    // Step 2: Sign the payload
    const signatureResult = await signLoginPayload({ account, payload });
    // Step 3: Call the login function we defined in the auth actions file
    await login(signatureResult);
  }

  return (
    <>
        {!account
            ? <ConnectButton client={client} />
            : <>
                <button disabled={!account} onClick={handleClick}>
                  Login
                </button>
                <LogOutButton />
              </>
        }
    </>
  );
};

export const LogOutButton: React.FC = () => {
  async function handleClick() {
    await logout();
  }
  return <button onClick={handleClick}>Log out</button>;
};