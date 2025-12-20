"use client";

import { useState } from "react";
import VideoCardGrid from "@/components/Videos/VideoCardGrid";
import { VideoSearch } from "@/components/Videos/VideoSearch";
import LivestreamGrid from "@/components/Live/LivestreamGrid";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash, Lock, Loader2, AlertTriangle } from "lucide-react";
import { useMembershipVerification } from "@/lib/hooks/unlock/useMembershipVerification";
import Link from "next/link";

const AllVideosContent: React.FC = () => {
  const { hasMembership, isLoading, error } = useMembershipVerification();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState<'created_at' | 'views_count' | 'likes_count' | 'updated_at'>('created_at');

  return (
    <div className="min-h-screen px-0 py-6 sm:px-6 sm:py-6">
      <div className="mb-8 rounded-lg bg-white dark:bg-gray-800/60 p-8 shadow-md">
        <h1 className="mb-6 text-center text-4xl font-bold text-gray-800 dark:text-gray-200">
          Discover Amazing Music Videos
        </h1>
        <p className="mb-8 text-center text-gray-600 dark:text-gray-400">
          Explore our collection of creative music videos from talented creators
          worldwide. Find something inspiring and share it with your friends!
        </p>
      </div>
      <div className="my-5 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <span role="img" aria-label="home">
                  🏠
                </span>{" "}
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink>
                <BreadcrumbPage>Discover</BreadcrumbPage>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Live Streams Section - Members Only */}
      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-bold flex items-center gap-2">
          Live Now
          {!hasMembership && !isLoading && (
            <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border-2 border-red-300 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400 dark:text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
              Verification Error
            </h3>
            <p className="text-red-600 dark:text-red-400 mb-4">
              Unable to verify membership status. Please try again later.
            </p>
          </div>
        ) : hasMembership ? (
          <LivestreamGrid />
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center">
            <Lock className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              NFT Membership Required
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Access to live streams is exclusive to NFT membership holders.
            </p>
            <Link
              href="https://join.creativeplatform.xyz"
              target="_blank"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-[#EC407A] hover:bg-primary/90 transition-colors"
            >
              Get Membership
            </Link>
          </div>
        )}
      </div>

      {/* Videos Section */}
      <div>
        <h2 className="my-4 text-2xl font-bold">Discover Videos</h2>

        {/* Search and Filter Controls */}
        <VideoSearch
          onSearchChange={setSearchQuery}
          onCategoryChange={setCategory}
          onSortChange={setSortBy}
          initialSearch={searchQuery}
          initialCategory={category}
          initialSort={sortBy}
        />

        {/* Video Grid */}
        <VideoCardGrid
          searchQuery={searchQuery}
          category={category}
          orderBy={sortBy}
        />
      </div>
      {/* Livestream Section - Commented out */}
      {/* <div>
        <h2 className="my-4 text-2xl font-bold">All Videos</h2>
        <LivestreamGrid />
      </div> */}
    </div>
  );
};

export default AllVideosContent;
