"use server";
import { VerifyLoginPayloadParams, createAuth } from "thirdweb/auth";
import { cookies } from "next/headers";
import { thirdwebAuth } from "@app/lib/sdk/thirdweb/auth";

export const generatePayload = thirdwebAuth.generatePayload;

export async function login(payload: VerifyLoginPayloadParams) {
  const verifiedPayload = await thirdwebAuth.verifyPayload(payload);
  console.log({ payload });
  
  
  if (verifiedPayload.valid) {
    const jwt = await thirdwebAuth.generateJWT({
      payload: verifiedPayload.payload,
    });
    console.log({ jwt });
    cookies().set("thirdweb_jwt", jwt);
  }
}

export async function isLoggedIn() {
  const jwt = cookies().get("thirdweb_jwt");

  if (!jwt?.value) {
    return false;
  }

  const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
  console.log({ authResult });
  
  if (authResult.valid) {
    return true;
  }
  return false;
}

export async function logout() {
  cookies().delete("thirdweb_jwt");
}