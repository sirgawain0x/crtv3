import { GraphQLClient } from 'graphql-request';

const INDEXER_URL = 'https://indexer.dev.hyperindex.xyz/b465779/v1/graphql';

export const hyperindexClient = new GraphQLClient(INDEXER_URL, {
  headers: {
    'Content-Type': 'application/json',
  },
});
