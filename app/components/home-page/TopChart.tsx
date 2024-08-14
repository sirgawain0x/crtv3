'use client';
import { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import makeBlockie from 'ethereum-blockies-base64';
import { shortenAddress } from 'thirdweb/utils';
import { StackClient } from '@stackso/js-core';

// Initialize the client
const stack = new StackClient({
  apiKey: `${process.env.STACK_API_KEY}`,
  pointSystemId: 2777,
});

interface LeaderboardItem {
  uniqueId: number;
  address: string;
  points: number;
  identities: any;
  bannerUrl?: string;
  name?: string;
  description?: string;
}

export function TopChart() {
  const [data, setData] = useState<LeaderboardItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const leaderboard = await stack.getLeaderboard({ limit: 20 });
      setData(
        leaderboard?.leaderboard.map((item, i) => ({
          uniqueId: i + 1, // Ensure unique IDs start at 1
          address: item.address,
          points: item.points,
          identities: item.identities || [],
          bannerUrl: leaderboard?.metadata.bannerUrl,
          name: leaderboard?.metadata.name,
          description: leaderboard?.metadata.description,
        })),
      );
    };

    fetchData();
  }, []);

  // Split data into columns
  const columns: LeaderboardItem[][] = [[], [], [], []]; // Adjust this if you want more or fewer columns
  data.forEach((item, index) => {
    const columnIndex = Math.floor(index / 5); // Divide items into groups of 5
    if (columns[columnIndex]) {
      columns[columnIndex].push(item);
    }
  });

  return (
    <div className="mx-auto w-full max-w-6xl py-8">
      <div className="mb-8 text-center">
        <h2 className="flex items-center justify-center gap-2 text-3xl font-bold">
          <TrophyIcon className="h-6 w-6 text-yellow-500" />
          TOP CREATIVES
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {columns.map((column, colIndex) => (
          <div
            key={colIndex}
            className={`mx-auto space-y-4 ${colIndex === 3 ? 'hidden lg:block' : ''} ${
              colIndex === 2 ? 'hidden md:block' : ''
            } `}
          >
            {column.map(({ uniqueId, address, points }) => (
              <div
                key={uniqueId}
                className="mx-auto flex items-center space-x-2"
              >
                <span>{uniqueId}.</span>
                <Avatar>
                  <AvatarImage src={makeBlockie(address)} />
                  <AvatarFallback>{makeBlockie('0x')}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span>{shortenAddress(address)}</span>
                  <span className="text-gray-500">{points} points</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrophyIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function XIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
