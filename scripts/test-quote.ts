import 'dotenv/config';

const contractAddress = "0x81ced3c6e7058c1fe8d9b6c5a2435a65a4593292";

async function main() {
    try {
        // Guessing params based on buy args: amount? side?
        // Let's try raw first, then with amount.
        const amount = "1000000000000000000"; // 1 DEARCRTV
        const url = `https://public.api.paragraph.com/api/v1/coins/quote/contract/${contractAddress}?amount=${amount}&side=sell`;
        // Logic: usually quote needs amount and operation (buy/sell). 
        // Or maybe just amount if it's "buy quote" by default? 
        // User snippet says `coins/quote`.

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
            console.error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            console.error('Response:', text);
        } else {
            const data = await response.json();
            console.log('Quote Response:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Error fetching quote:', error);
    }
}

main();
