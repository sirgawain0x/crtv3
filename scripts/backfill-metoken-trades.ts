/** Preview one bounded finalized window. Writes require both --apply and the rollout flag. */
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const args = process.argv.slice(2);
  const value = (name: string) => {
    const index = args.indexOf('--' + name);
    if (index < 0) return undefined;
    const raw = args[index + 1];
    if (!raw || !/^\d+$/.test(raw)) throw new Error('Supply an integer for --' + name);
    return Number(raw);
  };
  const { indexMeTokenTrades } = await import('../lib/metokens/tradeIndexer');
  const result = await indexMeTokenTrades({ lookbackBlocks: value('lookback'), fromBlock: value('from'), toBlock: value('to'), dryRun: !args.includes('--apply') });
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
main().catch(() => { console.error('Trade backfill failed. Check the block window and private server RPC configuration.'); process.exitCode = 1; });
