import { Broadcast } from '@app/components/Live/Broadcast';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb';
import { Slash, VideoIcon } from 'lucide-react';

export default function BroadcastPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mb-8 rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 flex items-center justify-center gap-2 text-center text-4xl font-bold text-red-600">
          <VideoIcon className="h-10 w-10" />
          <span>LIVE</span>
        </h1>
        <p className="mb-8 text-center text-gray-600">THE STAGE IS YOURS</p>
      </div>
      <div className="my-5 p-4">
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
              <BreadcrumbLink>
                <BreadcrumbPage>Live</BreadcrumbPage>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div>
        <Broadcast streamKey={'24dc-z32j-qafy-yskq'} />
      </div>
    </div>
  );
}
