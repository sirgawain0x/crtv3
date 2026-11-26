/**
 * Regression check for the production build failure: importing modules that
 * build an Alchemy client at module scope must not throw when the API key is
 * absent. Run with ALCHEMY_API_KEY / NEXT_PUBLIC_ALCHEMY_API_KEY unset.
 */
import { getAlchemyApiKey, getAlchemyTransport } from "../lib/web3/alchemy-key";

console.log("key present:", Boolean(getAlchemyApiKey()));
getAlchemyTransport("base-mainnet");
console.log("getAlchemyTransport OK");

// The module that broke /api/internal/sign-jwt.
await import("../lib/utils/metoken-access");
console.log("metoken-access module-scope init OK");
