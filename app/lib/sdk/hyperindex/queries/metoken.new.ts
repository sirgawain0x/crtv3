import { gql } from 'graphql-request';
import { hyperindexClient } from '../client';

// Query to check if a user has registered a metoken
export const GET_USER_METOKEN = gql`
  query GetUserMetoken($owner: String!) {
    Metokens_Subscribe(
      where: { owner: { _eq: $owner } }
      order_by: { db_write_timestamp: desc }
      limit: 1
    ) {
      id
      owner
      name
      symbol
      meToken
      asset
      assetsDeposited
      minted
      hubId
      db_write_timestamp
    }
  }
`;

// Query to get metoken balances
export const GET_METOKEN_BALANCES = gql`
  query GetMetokenBalances($tokenId: String!) {
    Metokens_UpdateBalances(
      where: { id: { _eq: $tokenId } }
      order_by: { blockTimestamp: desc }
      limit: 1
    ) {
      id
      balancePooled
      balanceLocked
      blockTimestamp
    }
  }
`;

export interface MetokenRegistration {
  id: string;
  owner: string;
  name: string;
  symbol: string;
  meToken: string;
  asset: string;
  assetsDeposited: string;
  minted: string;
  hubId: string;
  db_write_timestamp: string;
}

export interface MetokenBalances {
  id: string;
  balancePooled: string;
  balanceLocked: string;
  blockTimestamp: string;
}

export interface MetokenRegistrationResponse {
  Metokens_Subscribe: MetokenRegistration[];
}

export interface MetokenBalancesResponse {
  Metokens_UpdateBalances: MetokenBalances[];
}

export async function getUserMetoken(
  owner: string,
): Promise<MetokenRegistration | null> {
  try {
    const response =
      await hyperindexClient.request<MetokenRegistrationResponse>(
        GET_USER_METOKEN,
        {
          owner: owner.toLowerCase(),
        },
      );

    return response.Metokens_Subscribe[0] || null;
  } catch (error) {
    console.error('Error fetching user metoken:', error);
    return null;
  }
}

export async function getMetokenBalances(
  tokenId: string,
): Promise<MetokenBalances | null> {
  try {
    const response = await hyperindexClient.request<MetokenBalancesResponse>(
      GET_METOKEN_BALANCES,
      {
        tokenId,
      },
    );

    return response.Metokens_UpdateBalances[0] || null;
  } catch (error) {
    console.error('Error fetching metoken balances:', error);
    return null;
  }
}
