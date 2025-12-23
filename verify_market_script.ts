
import { createPublicClient, http, parseAbi, formatEther } from 'viem';
import { base } from 'viem/chains';
import { getMeTokenInfoFromBlockchain, getMeTokenProtocolInfo } from './lib/utils/metokenUtils';

async function main() {
    console.log('🚀 Starting Market Data Verification...');

    // 1. Find a recent MeToken
    const publicClient = createPublicClient({
        chain: base,
        transport: http('https://base.llamarpc.com')
    });

    const METOKEN_FACTORY_ADDRESS = '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B';
    const METOKEN_FACTORY_ABI = parseAbi([
        'event MeTokenCreated(address indexed meToken, address indexed owner, string name, string symbol)'
    ]);

    console.log('🔍 Searching for a recent MeToken...');
    const currentBlock = await publicClient.getBlockNumber();

    let matchFound = false;
    let meTokenAddress;
    let tokenName;

    // Scan back up to 50k blocks in chunks
    const chunkSize = 800n;
    const maxBlocks = 50000n;

    for (let i = 0n; i < maxBlocks; i += chunkSize) {
        const toBlock = currentBlock - i;
        const fromBlock = toBlock - chunkSize;

        console.log(`Scanning blocks ${fromBlock} to ${toBlock}...`);

        try {
            const logs = await publicClient.getLogs({
                address: METOKEN_FACTORY_ADDRESS,
                event: METOKEN_FACTORY_ABI[0],
                fromBlock,
                toBlock
            });

            if (logs.length > 0) {
                const lastLog = logs[logs.length - 1];
                meTokenAddress = lastLog.args.meToken;
                tokenName = lastLog.args.name;
                matchFound = true;
                break;
            }
        } catch (e) {
            console.warn(`Error scanning chunk ${fromBlock}-${toBlock}:`, e);
        }
    }

    if (!matchFound || !meTokenAddress) {
        console.error('❌ No MeTokens found in the scan range.');
        // Fallback: Try a known MeToken address if scan fails?
        // Using the one from the error log often helps: 0xd211555194aca0ed23d7fbba8f6444879bf20f13
        console.log('⚠️ Falling back to known address from logs if available...');
        meTokenAddress = '0xd211555194aca0ed23d7fbba8f6444879bf20f13';
    } else {
        console.log(`✅ Found MeToken: ${meTokenAddress} (${tokenName})`);
    }

    // 2. Fetch Info using our Utils
    console.log('------------------------------------------------');
    console.log(`📡 Fetching data for ${meTokenAddress}...`);

    try {
        const [tokenInfo, protocolInfo] = await Promise.all([
            getMeTokenInfoFromBlockchain(meTokenAddress),
            getMeTokenProtocolInfo(meTokenAddress)
        ]);

        if (!tokenInfo) {
            console.error('❌ getMeTokenInfoFromBlockchain returned null');
        } else {
            console.log('✅ Token Info:', tokenInfo);
        }

        if (!protocolInfo) {
            console.error('❌ getMeTokenProtocolInfo returned null');
        } else {
            console.log('✅ Protocol Info:', protocolInfo);
        }

        if (tokenInfo && protocolInfo) {
            // 3. Calculate Price and TVL (Logic from route.ts)
            const balancePooled = BigInt(protocolInfo.balancePooled || 0);
            const balanceLocked = BigInt(protocolInfo.balanceLocked || 0);
            const totalBalance = balancePooled + balanceLocked;
            const tvl = parseFloat(formatEther(totalBalance));
            const supply = parseFloat(formatEther(BigInt(tokenInfo.totalSupply)));
            const price = supply > 0 ? tvl / supply : 0;

            console.log('------------------------------------------------');
            console.log('📊 Calculated Market Data:');
            console.log(`💰 Price: $${price.toFixed(6)} ETH`);
            console.log(`🔒 TVL: ${tvl.toFixed(6)} ETH`);
            console.log(`📦 Supply: ${supply.toFixed(2)}`);

            console.log('✅ VERIFICATION SUCCESSFUL');
        }

    } catch (error) {
        console.error('❌ Error during verification:', error);
    }
}

main().catch(console.error);
