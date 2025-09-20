import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

export function makeServerClient() {
  const snapshotApiUrl =
    process.env.NEXT_PUBLIC_SNAPSHOT_API_URL || "https://hub.snapshot.org";

  return new ApolloClient({
    ssrMode: true,
    link: new HttpLink({
      uri: `${snapshotApiUrl}/graphql`,
      fetch,
    }),
    cache: new InMemoryCache(),
  });
}
