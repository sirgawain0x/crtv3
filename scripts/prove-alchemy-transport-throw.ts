/**
 * Proves the production build failure's mechanism: `alchemy()` from
 * @account-kit/infra validates its config with zod and throws `invalid_union`
 * when no apiKey/jwt/rpcUrl is supplied. Any module-scope `alchemy({ apiKey })`
 * built from a missing env var therefore breaks `next build`.
 */
import { alchemy } from "@account-kit/infra";

try {
  alchemy({ apiKey: undefined as unknown as string });
  console.log("NO THROW — diagnosis would be wrong");
  process.exit(1);
} catch (error) {
  const name = error instanceof Error ? error.name : typeof error;
  const code = (error as { issues?: { code?: string }[] }).issues?.[0]?.code;
  console.log(`THREW as expected: name=${name} zodIssue=${code ?? "n/a"}`);
}
