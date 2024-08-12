import VideoCardGrid from '@app/components/Videos/VideoCardGrid';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb';
import { Slash } from 'lucide-react';

const AllVideosContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
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
                <BreadcrumbPage>Discover</BreadcrumbPage>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="mb-8 rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-4xl font-bold text-gray-800">
          Discover Amazing Videos
        </h1>
        <p className="mb-8 text-center text-gray-600">
          Explore our collection of creative videos from talented creators
          worldwide. Find something inspiring and share it with your friends!
        </p>
      </div>
      <div className="mx-auto max-w-screen-xl">
        <h2 className="mb-4 text-3xl font-semibold text-gray-700">
          Video Gallery
        </h2>
        <VideoCardGrid />
      </div>
    </div>
  );
};

export default AllVideosContent;
