"use server";
import { VerifyLoginPayloadParams } from "thirdweb/auth";
import { thirdwebAuth } from "@app/lib/sdk/thirdweb/auth";
import { cookies } from "next/headers";;

export const generatePayload = thirdwebAuth.generatePayload;

export async function login(payload: VerifyLoginPayloadParams): Promise<{ valid: Boolean }> {
  const verifiedPayload = await thirdwebAuth.verifyPayload(payload);
  if (verifiedPayload.valid) {
    const jwt = await thirdwebAuth.generateJWT({
      payload: verifiedPayload.payload,
    });
    cookies().set("jwt", jwt);
    return {
        valid: true
    }
  }
  return {
    valid: false
  }
}

export async function isLoggedIn() {
  const jwt = cookies().get("jwt");
  if (!jwt?.value) {
    return false;
  }

  const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
  return authResult.valid;
}

export async function logout() {
  console.log('logging out!');
  cookies().delete("jwt");
}
