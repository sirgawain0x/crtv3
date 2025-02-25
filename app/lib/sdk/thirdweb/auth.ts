import { createAuth } from "thirdweb/auth";
import { privateKeyToAccount } from "thirdweb/wallets";
import { client } from "./client";

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || "";

if (!privateKey) {
  throw new Error("Missing THIRDWEB_ADMIN_PRIVATE_KEY in .env file.");
}

const domain = process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN;
if (!domain) {
  throw new Error("Missing NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN in .env file.");
}

export const thirdwebAuth = createAuth({
  domain,
  adminAccount: privateKeyToAccount({ client, privateKey }),
});