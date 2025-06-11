'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Skeleton from '../ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard, type LeaderboardItem } from '../../lib/actions/stack';

function LeaderboardCard({
  item,
  index,
}: {
  item: LeaderboardItem;
  index: number;
}) {
  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <Avatar className="h-16 w-16">
          <AvatarImage src={item.user.avatar} alt={item.user.name} />
          <AvatarFallback>{item.user.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {index + 1}
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="font-medium leading-none">{item.user.name}</h3>
        <p className="text-sm text-muted-foreground">{item.points} points</p>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-8">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TopChart() {
  const {
    data: leaderboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard,
  });

  if (isLoading) return <LeaderboardSkeleton />;
  if (error) return <div>Error loading leaderboard</div>;
  if (!leaderboardData) return null;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                Top Contributors
              </h2>
              <p className="text-sm text-muted-foreground">
                This month&apos;s most active community members
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {leaderboardData.map((item, index) => (
              <LeaderboardCard key={item.user.id} item={item} index={index} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
