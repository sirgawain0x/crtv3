// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import { ThirdwebAuthHandler } from "@thirdweb-dev/auth/next-auth";
import { client } from "@app/lib/sdk/thirdweb/client";

export default NextAuth({
  providers: [
    ThirdwebAuthHandler({
      client,
      domain: "http://localhost:3000", 
    }),
  ],
});