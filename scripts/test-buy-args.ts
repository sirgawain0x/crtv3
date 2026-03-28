import 'dotenv/config';

const contractAddress = "0x81ced3c6e7058c1fe8d9b6c5a2435a65a4593292";

async function main() {
    try {
        const walletAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Dummy address (Hardhat #0)
        const amount = "1000000000000000"; // 0.001 ETH
        const url = `https://public.api.paragraph.com/api/v1/coins/buy/contract/${contractAddress}?walletAddress=${walletAddress}&amount=${amount}`;
        console.log(`Fetching from: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://paragraph.xyz',
                'Origin': 'https://paragraph.xyz',
                'Authorization': `Bearer ${process.env.PARAGRAPH_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Buy Args Response:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error fetching buy args:', error);
    }
}

main();
