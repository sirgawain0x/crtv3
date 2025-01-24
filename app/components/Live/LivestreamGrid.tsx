'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@app/components/ui/card';
import Link from 'next/link';

interface Stream {
  id: string;
  name?: string;
  playbackId?: string;
  createdAt?: string;
  isActive?: boolean;
}

export default function LivestreamGrid() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const response = await fetch('/api/livepeer/streams');
        if (!response.ok) {
          throw new Error('Failed to fetch streams');
        }
        const result = await response.json();
        const mappedStreams = result?.data?.map((stream: Stream) => ({
          ...stream,
          name: stream.name || `Stream ${stream.id}`, // Provide a default name if none exists
        })) ?? [];
        setStreams(mappedStreams);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching streams:', error);
        setLoading(false);
      }
    };
    fetchStreams();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No active livestreams at the moment
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {streams.map((stream) => (
        <Link key={stream.id} href={`/watch/${stream.playbackId}`}>
          <Card className="overflow-hidden transition-shadow hover:shadow-lg">
            <div className="relative aspect-video bg-gray-100">
              {/* Livestream thumbnail */}
              <div className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                LIVE
              </div>
            </div>
            <div className="p-4">
              <h3 className="truncate font-semibold">{stream.name}</h3>
              <p className="text-sm text-gray-500">
                Started{' '}
                {stream.createdAt
                  ? new Date(stream.createdAt).toLocaleDateString()
                  : 'Unknown date'}
              </p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
