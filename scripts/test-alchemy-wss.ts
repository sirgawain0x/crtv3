import 'dotenv/config';

async function main() {
    console.log('Testing Alchemy connectivity with Origin spoofing...');

    const apiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) {
        console.error('Error: API keys not found in environment');
        process.exit(1);
    }

    const url = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;

    try {
        console.log('Fetching block number via HTTP with Origin: http://localhost:3000 ...');

        // Manual fetch with headers
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3000' // Spoof localhost
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_blockNumber',
                params: []
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP Error: ${response.status} - ${text}`);
        }

        const data = await response.json();
        console.log('✅ Success! Response:', JSON.stringify(data, null, 2));

        if (data.result) {
            console.log('Current Block (Hex):', data.result);
            console.log('Current Block (Dec):', parseInt(data.result, 16));
            process.exit(0);
        } else {
            console.error('❌ No result in response');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Connectivity Check Failed:', error);
        process.exit(1);
    }
}

main();
