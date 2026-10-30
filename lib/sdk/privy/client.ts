import { PrivyClient } from "@privy-io/node";
import {
  getPrivyAppId,
  getPrivyAppSecret,
  getPrivyWebhookSigningSecret,
} from "./config";

let privyClient: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    const webhookSigningSecret = getPrivyWebhookSigningSecret();
    privyClient = new PrivyClient({
      appId: getPrivyAppId(),
      appSecret: getPrivyAppSecret(),
      ...(process.env.PRIVY_JWT_VERIFICATION_KEY
        ? { jwtVerificationKey: process.env.PRIVY_JWT_VERIFICATION_KEY }
        : {}),
      ...(webhookSigningSecret ? { webhookSigningSecret } : {}),
    });
  }
  return privyClient;
}
