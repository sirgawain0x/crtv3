import 'dotenv/config';
import { ParagraphAPI } from '@paragraph-com/sdk';

async function main() {
    try {
        const api = new ParagraphAPI();
        const domain = "news.creativeplatform.xyz";

        // @ts-ignore
        const pub = await api.publications.get({ domain }).single();
        console.log('Publication ID:', pub.id);

        if (pub && pub.id) {
            console.log('\n--- Subscribers ---');
            try {
                // @ts-ignore
                // Try .get() which usually returns a builder, then .list() or .single() or .items
                // Based on posts example: api.posts.get({ publicationId })...
                // So maybe: api.subscribers.get({ publicationId })...
                const subResponse = await api.subscribers.get({ publicationId: pub.id });
                // @ts-ignore
                console.log('Subscribers items:', subResponse.items?.length);
            } catch (e) {
                console.log('Error fetching subscribers (public):', e.message);
            }

            console.log('\n--- Coins ---');
            try {
                // @ts-ignore
                const coinsResponse = await api.coins.get({ publicationId: pub.id });
                // @ts-ignore
                console.log('Coins items:', coinsResponse.items?.length);
            } catch (e) {
                console.log('Error fetching coins (public):', e.message);
            }
        }

    } catch (error) {
        console.error('Main Error:', error);
    }
}

main();
