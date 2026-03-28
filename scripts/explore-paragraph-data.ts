import 'dotenv/config';
import { ParagraphAPI } from '@paragraph-com/sdk';

async function main() {
    try {
        const api = new ParagraphAPI(); // Public instance
        const domain = "news.creativeplatform.xyz";

        console.log('Fetching with PUBLIC client...');

        // @ts-ignore
        const pub = await api.publications.get({ domain }).single();
        const publicationId = pub.id;

        if (publicationId) {
            const { items: posts } = await api.posts.get({ publicationId });
            if (posts.length > 0) {
                const firstPostId = posts[0].id;
                console.log(`Fetching post ${firstPostId}...`);

                // @ts-ignore
                const fullPost = await api.posts.get({ id: firstPostId }).single();
                console.log('Keys:', Object.keys(fullPost));

                // Check widely
                console.log('Content check:', JSON.stringify(fullPost, null, 2));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
