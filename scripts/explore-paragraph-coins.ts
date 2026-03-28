import 'dotenv/config';
import { ParagraphAPI } from '@paragraph-com/sdk';

async function main() {
    try {
        const api = new ParagraphAPI();
        const coinAddress = "0x81ced3c6e7058c1fe8d9b6c5a2435a65a4593292";

        // @ts-ignore
        const coin = await api.coins.get({ contractAddress: coinAddress }).single();
        console.log('Coin Full:', JSON.stringify(coin, null, 2));

    } catch (error) {
        console.error('Main Error:', error);
    }
}

main();
