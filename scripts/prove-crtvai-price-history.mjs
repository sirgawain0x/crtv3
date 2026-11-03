#!/usr/bin/env node
/**
 * Read-only proof harness for CRTVAI price history (prod data).
 * Uses public Supabase anon key from SUPABASE_SETUP.md and public Base RPC via the local API route.
 */
const CRTVAI = '0xecb695544a3d2a64d579b3828f3f60f6932f4846';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

const periods = [
  ['7d', 'hour'],
  ['30d', 'day'],
  ['all', 'day'],
];

const out = {
  token: CRTVAI,
  baseUrl: BASE,
  capturedAt: new Date().toISOString(),
  marketList: null,
  fresh: null,
  priceHistory: {},
};

out.marketList = await fetchJson('/api/market/tokens?search=CRTVAI');
out.fresh = await fetchJson(`/api/market/tokens/${CRTVAI}/fresh`);

for (const [period, interval] of periods) {
  out.priceHistory[period] = await fetchJson(
    `/api/market/tokens/${CRTVAI}/price-history?period=${period}&interval=${interval}`
  );
}

console.log(JSON.stringify(out, null, 2));
