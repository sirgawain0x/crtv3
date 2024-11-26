"use server";

import { GenerateLoginPayloadParams, VerifyLoginPayloadParams, createAuth } from "thirdweb/auth";
import { privateKeyToAccount } from "thirdweb/wallets";
import { client } from "../../../lib/sdk/thirdweb/client";
import { cookies } from "next/headers";
// import { redirect } from "next/navigation";

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || "";

if (!privateKey) {
  throw new Error("Missing THIRDWEB_ADMIN_PRIVATE_KEY in .env file.");
}

const thirdwebAuth = createAuth({
  domain: process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || "",
  adminAccount: privateKeyToAccount({ client, privateKey }),
});

export const generatePayload = thirdwebAuth.generatePayload;

export async function login(payload: VerifyLoginPayloadParams) {
    console.log({ payload });
    const verifiedPayload = await thirdwebAuth.verifyPayload(payload);
    
    if (verifiedPayload.valid) {
        const jwt = await thirdwebAuth.generateJWT({
            payload: verifiedPayload.payload,
        });
        console.log({ jwt });
        
        cookies().set("jwt", jwt);

        // return redirect("/jwt-cookie/secure");
    }
}

export async function authedOnly() {
  const jwt = cookies().get("jwt");
  if (!jwt?.value) {
    // redirect("/jwt-cookie");
    return false;
  }

  const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
  if (!authResult.valid) {
    // redirect("/jwt-cookie");
    return false;
  }
  return true;
}

export async function logout() {
  cookies().delete("jwt");
}