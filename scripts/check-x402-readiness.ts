import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const { createX402Facilitator } = await import('../lib/payments/x402-facilitator');
const { CDP_FACILITATOR_URL, HERMES_X402_GATEWAY_URL, CREATIVE_TREASURY_ADDRESS, X402_NETWORK } = await import('../lib/payments/x402-config');
const problems: string[] = [];
try {
  const { supabaseService } = await import('../lib/sdk/supabase/service');
  if (!supabaseService) throw new Error('Receipt store not configured');
  const { error, status } = await supabaseService.from('platform_api_payment_receipts').select('transaction_hash').limit(0);
  if (error || status >= 400) problems.push('Payment replay receipt table is unavailable; apply the reviewed secure receipt migration before accepting payments.');
} catch {
  problems.push('Payment replay receipt store readiness check failed.');
}
try {
  const supported = await createX402Facilitator().getSupported();
  console.log('Coinbase facilitator supported networks:', supported.kinds.map((kind) => `${kind.x402Version}/${kind.scheme}/${kind.network}`).join(', '));
  if (!supported.kinds.some((kind) => kind.x402Version === 2 && kind.scheme === 'exact' && kind.network === X402_NETWORK)) {
    problems.push('Coinbase facilitator must support x402 v2 exact payments on Base mainnet.');
  }
} catch {
  problems.push('Coinbase facilitator authentication or supported-network check failed.');
}
try {
  const base = (process.env.HERMES_X402_GATEWAY_URL?.trim() || HERMES_X402_GATEWAY_URL).replace(/\/+$/, '');
  const stagingGatewayUrl = 'https://crtv-x402-staging---hermes-x402-gateway-3ortoh2aiq-uc.a.run.app';
  if (base !== HERMES_X402_GATEWAY_URL && base !== stagingGatewayUrl) throw new Error('Unexpected gateway URL');
  const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error('Unavailable');
  const health = await response.json();
  console.log('Hermes gateway:', { network: health.network, treasury: health.treasury, facilitator: health.facilitator });
  if (health.facilitator?.replace(/\/+$/, '') !== CDP_FACILITATOR_URL) problems.push('Hermes gateway is not using the Coinbase facilitator.');
  if (health.network !== X402_NETWORK) problems.push('Hermes gateway network must be Base mainnet.');
  if (health.treasury?.toLowerCase() !== CREATIVE_TREASURY_ADDRESS.toLowerCase()) problems.push('Hermes gateway treasury does not match the approved Safe.');
  const cardResponse = await fetch(`${base}/.well-known/agent-card.json`, { signal: AbortSignal.timeout(15_000) });
  if (!cardResponse.ok) throw new Error('Discovery unavailable');
  const card = await cardResponse.json();
  if (!card.skills?.some((skill: { id: string }) => skill.id === 'creative-tv')) problems.push('Hermes gateway needs the deployed Creative TV route before enabling the gateway adapter.');
} catch {
  problems.push('Hermes gateway readiness check failed.');
}
if (problems.length) {
  for (const problem of problems) console.error('BLOCKED:', problem);
  process.exitCode = 1;
} else console.log('x402 service configuration checks passed; a separately approved paid E2E test is still required.');
