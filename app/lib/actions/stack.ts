'use server';

import { stack } from '../sdk/stack/client';

export interface LeaderboardItem {
  rank: number;
  points: number;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
}

export async function getLeaderboard() {
  try {
    const data = await stack.getLeaderboard({
      query: {
        limit: 10,
      },
    });
    return data as unknown as LeaderboardItem[];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw new Error('Failed to fetch leaderboard data');
  }
}

export async function getPoints(address: string) {
  try {
    return await stack.getPoints(address);
  } catch (error) {
    console.error('Error fetching points:', error);
    throw new Error('Failed to fetch points');
  }
}

export async function track(event: string, data: any) {
  try {
    return await stack.track(event, data);
  } catch (error) {
    console.error('Error tracking event:', error);
    throw new Error('Failed to track event');
  }
}
