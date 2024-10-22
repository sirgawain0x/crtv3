//import CreateAndViewAsset from '@app/components/Videos/Upload/CreateAndViewAsset';
import HookMultiStepForm from '@app/components/Videos/Upload';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb';
import { Slash } from 'lucide-react';

export default function Upload() {
  return (
    <div className="min-h-screen p-6">
      <div className="mb-8 rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-4xl font-bold text-gray-800">
          Upload Your Video
        </h1>
        <p className="mb-8 text-center text-gray-600">
          Upload your video to the platform and share it with the world.
        </p>
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
                <BreadcrumbPage>Upload</BreadcrumbPage>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div>
        <HookMultiStepForm />
      </div>
    </div>
  );
}
