import { GraphQLClient } from 'graphql-request';

const INDEXER_URL = process.env.NEXT_PUBLIC_HYPERINDEX_ENDPOINT as string;

export const hyperindexClient = new GraphQLClient(INDEXER_URL, {
  headers: {
    'Content-Type': 'application/json',
  },
});
