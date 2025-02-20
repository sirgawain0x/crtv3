"use server";

import { cookies } from "next/headers";
import { VerifyLoginPayloadParams } from "thirdweb/auth";
import { thirdwebAuth } from "@app/lib/sdk/thirdweb/auth";
import { decodeJWT } from "thirdweb/utils";

export type JwtContext = {
  address: string;
}

// Convert to async function
export async function generateAuthPayload(params: Parameters<typeof thirdwebAuth.generatePayload>[0]) {
  return thirdwebAuth.generatePayload(params);
}

export async function login(payload: VerifyLoginPayloadParams) {
    try {
        const verifiedPayload = await thirdwebAuth.verifyPayload(payload);
        
        if (verifiedPayload.valid) {
            const jwt = await thirdwebAuth.generateJWT({
                payload: verifiedPayload.payload,
                context: {
                    address: verifiedPayload.payload.address,
                },
            });

            if (typeof jwt === 'string') {
                cookies().set("jwt", jwt, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                });
            } else {
                console.error('Invalid JWT format:', jwt);
                throw new Error('Invalid JWT format');
            }
        }
    } catch (error) {
        console.error('Login failed: ', error);
        throw error;
    }
}

export const getJwtContext: () => Promise<JwtContext> = async () => {
    const jwtCookie = cookies().get("jwt");
    
    if (!jwtCookie?.value) {
        return { address: '' }; // Return empty context instead of throwing
    }

    try {
        const decoded = await decodeJWT(jwtCookie.value);
        
        // Get address from ctx or sub field
        const ctx = decoded?.payload?.ctx as { address?: string } || {};
        const address = ctx.address || decoded?.payload?.sub;

        if (!address) {
            console.error('JWT missing address:', decoded);
            return { address: '' }; // Return empty context instead of throwing
        }

        return { address };
    } catch (error) {
        console.error('JWT decode failed:', error);
        return { address: '' }; // Return empty context instead of throwing
    }
};

export async function authedOnly() {
    const jwt = cookies().get("jwt");
    
    if (!jwt?.value) {
        return null; // Return null instead of throwing
    }

    try {
        const decoded = await decodeJWT(jwt.value);
        const ctx = decoded?.payload?.ctx as { address?: string } || {};
        const address = ctx.address || decoded?.payload?.sub;

        if (!address) {
            return null; // Return null instead of throwing
        }

        return { address };
    } catch (error) {
        console.error('Authentication check failed:', error);
        return null;
    }
}

export async function logout() {
    cookies().delete("jwt");
}