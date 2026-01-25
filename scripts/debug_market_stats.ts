
import { createClient } from '@supabase/supabase-js';
import { formatEther } from 'viem';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    console.log('🔍 Debugging Market Stats (ALL TRANSACTIONS & TOKENS)...');

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        console.log('📡 Fetching transactions from Supabase...');
        const { data: recentTxs, error } = await supabase
            .from('metoken_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ Error fetching transactions:', error);
            return;
        }

        if (recentTxs && recentTxs.length > 0) {
            console.log('📝 Sample Transactions (Latest 5):');
            recentTxs.forEach(tx => {
                console.log(`- [${tx.transaction_type}] Amount: ${tx.amount}, Collateral: ${tx.collateral_amount}, Time: ${tx.created_at}`);
            });
        } else {
            console.log("❌ No transactions found.");
        }

        console.log('\n📡 Checking recent Token updates (metokens table)...');
        const { data: recentTokens, error: tokenError } = await supabase
            .from('metokens')
            .select('symbol, updated_at, total_supply, tvl')
            .order('updated_at', { ascending: false })
            .limit(5);

        if (tokenError) {
            console.error("❌ Error fetching tokens:", tokenError);
        } else if (recentTokens) {
            recentTokens.forEach(t => console.log(`- Token ${t.symbol}: Updated ${t.updated_at}, Supply: ${t.total_supply}, TVL: ${t.tvl}`));
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

main();
