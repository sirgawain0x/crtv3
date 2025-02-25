"use server";

import { cookies } from "next/headers";
import { decodeJWT } from "thirdweb/utils";

export type JwtContext = {
  address: string;
}

// Simple authentication function that returns a dummy address for development
export async function authedOnly() {
  const jwt = cookies().get("jwt");
  
  if (!jwt?.value) {
    return { address: '0x0000000000000000000000000000000000000000' }; // Return dummy address
  }

  try {
    const decoded = await decodeJWT(jwt.value);
    const ctx = decoded?.payload?.ctx as { address?: string } || {};
    const address = ctx.address || decoded?.payload?.sub || '0x0000000000000000000000000000000000000000';

    return { address };
  } catch (error) {
    console.error('Authentication check failed:', error);
    return { address: '0x0000000000000000000000000000000000000000' }; // Return dummy address
  }
}

// Simple function to get the JWT context
export async function getJwtContext(): Promise<JwtContext> {
  const jwtCookie = cookies().get("jwt");
  
  if (!jwtCookie?.value) {
    return { address: '0x0000000000000000000000000000000000000000' }; // Return dummy address
  }

  try {
    const decoded = await decodeJWT(jwtCookie.value);
    const ctx = decoded?.payload?.ctx as { address?: string } || {};
    const address = ctx.address || decoded?.payload?.sub || '0x0000000000000000000000000000000000000000';

    return { address };
  } catch (error) {
    console.error('JWT context retrieval failed:', error);
    return { address: '0x0000000000000000000000000000000000000000' }; // Return dummy address
  }
}

// Logout function
export async function logout() {
  cookies().delete("jwt");
}
