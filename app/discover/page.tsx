import VideoCardGrid from '@app/components/Videos/VideoCardGrid';
import { AssetData } from '@app/lib/types';
import { livepeer } from '@app/lib/sdk/livepeer/client';
import { Suspense } from 'react';
import { Skeleton } from '@app/components/ui/skeleton';
import { Slash } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb';

async function AllVideosContent() {
  let assets: AssetData[] = [];
  let error: string | null = null;

  try {
    const assets = await livepeer.asset.getAll();
  } catch (err: any) {
    console.error('Failed to fetch assets:', err);
    error = 'Failed to fetch assets.';
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return <VideoCardGrid assets={assets} />;
}

export default async function AllVideosPage() {
  return (
    <main>
      <div className={'my-10 p-10'}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <span role="img" aria-label="home">
                  🏠
                </span>{' '}
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Discover</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="mx-auto p-10">
        <h1 className={'mb-10 text-6xl'}>Discover Content</h1>
        <p className="">This is the Discover page.</p>
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-4 w-[550px]"></Skeleton>
            </div>
          }
        >
          <AllVideosContent />
        </Suspense>
      </div>
    </main>
  );
}
