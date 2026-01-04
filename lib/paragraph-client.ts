import { ParagraphAPI } from '@paragraph-com/sdk';

if (!process.env.PARAGRAPH_API_KEY) {
    throw new Error('PARAGRAPH_API_KEY is not defined');
}

export const paragraph = new ParagraphAPI({
    apiKey: process.env.PARAGRAPH_API_KEY,
});
