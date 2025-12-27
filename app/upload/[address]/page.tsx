import { ProfilePageGuard } from "@/components/UserProfile/UserProfile";
import HookMultiStepForm from "@/components/Videos/Upload";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from "lucide-react";
import { UploadPageClient } from "./UploadPageClient";

interface UploadPageProps {
  params: Promise<{ address: string }>;
}

export default async function UploadPage({ params }: UploadPageProps) {
  const { address } = await params;

  return (
    <ProfilePageGuard>
      <UploadPageClient urlAddress={address}>
        <div className="min-h-screen p-2 sm:p-6">
          <div className="mb-6 rounded-lg bg-card border p-4 shadow-md sm:mb-8 sm:p-8">
            <h1 className="mb-4 text-center text-2xl font-bold text-foreground sm:mb-6 sm:text-4xl">
              Upload Your Music Video
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground sm:mb-8 sm:text-base">
              Upload your music video to the platform and share it with the world.
            </p>
          </div>
          <div className="my-3 p-2 sm:my-5 sm:p-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="text-xs sm:text-sm">
                    <span role="img" aria-label="home">
                      🏠
                    </span>{" "}
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <Slash className="h-3 w-3 sm:h-4 sm:w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink>
                    <BreadcrumbPage className="text-xs sm:text-sm">Upload</BreadcrumbPage>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div>
            <HookMultiStepForm />
          </div>
        </div>
      </UploadPageClient>
    </ProfilePageGuard>
  );
}
