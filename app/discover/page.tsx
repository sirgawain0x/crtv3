"use client";

import VideoCardGrid from "@/components/Videos/VideoCardGrid";
import LivestreamGrid from "@/components/Live/LivestreamGrid";
import OrbisVideoCardGrid from "@/components/Live/LivestreamGrid";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash, Lock, Loader2 } from "lucide-react";
import { useMembershipVerification } from "@/lib/hooks/unlock/useMembershipVerification";
import Link from "next/link";

const AllVideosContent: React.FC = () => {
  const { hasMembership, isLoading } = useMembershipVerification();

  return (
    <div className="min-h-screen p-6">
      <div className="mb-8 rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-4xl font-bold text-gray-800">
          Discover Amazing Music Videos
        </h1>
        <p className="mb-8 text-center text-gray-600">
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
            <Lock className="h-5 w-5 text-gray-500" />
          )}
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : hasMembership ? (
          <LivestreamGrid />
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              NFT Membership Required
            </h3>
            <p className="text-gray-600 mb-4">
              Access to live streams is exclusive to NFT membership holders.
            </p>
            <Link
              href="/portfolio"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Get Membership
            </Link>
          </div>
        )}
      </div>

      {/* Videos Section */}
      <div>
        <h2 className="my-4 text-2xl font-bold">New Videos</h2>
        <VideoCardGrid />
      </div>
      {/*Orbis Videos Section */}
      {/* <div>
        <h2 className="my-4 text-2xl font-bold">All Videos</h2>
        <OrbisVideoCardGrid />
      </div> */}
    </div>
  );
};

export default AllVideosContent;
