import { GraphQLClient, gql } from 'graphql-request';

const clientKey = process.env.SOUND_XYZ_KEY;

// Only initialize if key is present
const soundAPI = clientKey
    ? new GraphQLClient('https://api.sound.xyz/graphql', {
        headers: { 'x-sound-client-key': clientKey }
    })
    : null;

export const fetchContractDetails = async (address: string) => {
    if (!soundAPI) return null;

    try {
        const query = gql`
      query ContractDetails($address: Address!) {
        releaseContract(contractAddress: $address) {
          title
          coverImage {
            url
          }
          artist {
            name
          }
        }
      }
    `;

        const data = await soundAPI.request<any>(query, { address });
        const release = data?.releaseContract;

        if (release) {
            return {
                name: `${release.artist?.name || 'Unknown'} - ${release.title || 'Untitled'}`,
                image: release.coverImage?.url || ''
            };
        }
        return null;

    } catch (error) {
        console.warn(`Failed to fetch Sound metadata for ${address}:`, error);
        return null;
    }
};
