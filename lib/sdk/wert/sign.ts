import jwt from "jsonwebtoken";

interface WertSessionPayload {
  partner_id: string;
  address: string;
  email?: string;
  [key: string]: unknown;
}

export function signWertSession(payload: WertSessionPayload): string {
  const privateKey = process.env.WERT_PRIVATE_KEY;
  if (!privateKey) throw new Error("WERT_PRIVATE_KEY not set in environment");
  return jwt.sign(payload, privateKey, { algorithm: "HS256" });
}

export type { WertSessionPayload };
