import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireWalletAuth, WalletAuthError } from "@/lib/auth/require-wallet";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { NotificationError } from "@/lib/notification-errors";
import { allowedPushEndpoint } from "@/lib/push-policy";
import { notificationInbox, markNotificationRead, subscribePush, unsubscribePush, pushDeviceStatus, testPush } from "@/lib/notifications";

export const runtime = "nodejs";
export const maxDuration = 300;
const endpoint = z.string().max(4096).refine(allowedPushEndpoint);
const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), id: z.string().min(1).max(128).optional() }).strict(),
  z.object({ action: z.literal("push-subscribe"), subscription: z.unknown() }).strict(),
  z.object({ action: z.literal("push-status"), endpoint }).strict(),
  z.object({ action: z.literal("push-unsubscribe"), endpoint }).strict(),
  z.object({ action: z.literal("push-test"), endpoint }).strict(),
]);
const json = (value: unknown, status = 200) => NextResponse.json(value, {
  status, headers: { "Cache-Control": "private, no-store" },
});
function failure(error: unknown) {
  if (error instanceof WalletAuthError || error instanceof NotificationError) return json({ error: error.message }, error.status);
  if (error instanceof ZodError || error instanceof SyntaxError) return json({ error: "Invalid notification request." }, 400);
  return json({ error: "Notifications are temporarily unavailable." }, 503);
}
export async function GET(request: NextRequest) {
  try {
    const limited = await rateLimiters.standard(request);
    if (limited) return limited;
    const { address } = await requireWalletAuth(request);
    return json(await notificationInbox(address));
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimiters.standard(request);
    if (limited) return limited;
    const { address } = await requireWalletAuth(request);
    const input = action.parse(await request.json());
    switch (input.action) {
      case "read": return json(await markNotificationRead(address, input.id));
      case "push-subscribe": return json(await subscribePush(address, input.subscription));
      case "push-unsubscribe": return json(await unsubscribePush(address, input.endpoint));
      case "push-status": return json(await pushDeviceStatus(address, input.endpoint));
      case "push-test": return json(await testPush(address, input.endpoint));
    }
  } catch (error) { return failure(error); }
}
