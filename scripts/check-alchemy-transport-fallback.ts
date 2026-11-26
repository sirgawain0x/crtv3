/**
 * Reproduces the production build failure mode: routes throw while Next collects
 * page data because a module-scope Alchemy transport is constructed with an
 * empty API key. Run with the key unset.
 */
import { getAlchemyTransport, getAlchemyApiKey } from "../lib/web3/alchemy-key";

const key = getAlchemyApiKey();
console.log("key present:", Boolean(key));

try {
  const transport = getAlchemyTransport("base-mainnet");
  console.log("getAlchemyTransport OK, type =", transport.type ?? "(no type field)");
} catch (error) {
  console.error("getAlchemyTransport THREW:", error);
  process.exit(1);
}

// The module that broke /api/internal/sign-jwt. Importing it must not throw.
try {
  await import("../lib/utils/metoken-access");
  console.log("metoken-access module-scope init OK");
} catch (error) {
  console.error("metoken-access THREW at import:", error);
  process.exit(1);
}
