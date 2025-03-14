import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb';
import { Slash, Bot } from 'lucide-react';
import DaydreamEmbed from '@app/components/Daydream/DaydreamEmbed';
export default function AIClipzPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mb-8 rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 flex items-center justify-center gap-2 text-center text-4xl font-bold text-red-600">
          <Bot className="h-10 w-10" />
          <span>AI Clipz</span>
        </h1>
        <p className="mb-8 text-center text-gray-600">
          Use your imagination to become anything or anyone you want.
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
                <BreadcrumbPage>AI Clipz</BreadcrumbPage>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="mx-auto max-w-7xl">
        <DaydreamEmbed />
      </div>
    </div>
  );
}
