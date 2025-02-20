import { GraphQLClient } from 'graphql-request';

const INDEXER_URL = 'https://indexer.dev.hyperindex.xyz/44a4cd8/v1/graphql';

export const hyperindexClient = new GraphQLClient(INDEXER_URL, {
  headers: {
    'Content-Type': 'application/json',
  },
});
