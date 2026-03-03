import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from "lucide-react";
import Link from "next/link";
import UserProfile from "@/components/UserProfile/UserProfile";
import { ProfileOwnerGuard } from "@/components/UserProfile/ProfileOwnerGuard";

interface ProfilePageProps {
  params: Promise<{ address: string }>;
}

export default async function Profile({ params }: ProfilePageProps) {
  const { address } = await params;

  return (
    <ProfileOwnerGuard urlAddress={address}>
    <div className="min-h-screen bg-background px-4 py-6 md:px-6 lg:px-8">
      <div className="mb-6 md:mb-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="flex items-center hover:text-primary">
                  <span role="img" aria-label="home" className="mr-1">
                    🏠
                  </span>{" "}
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink>
                <BreadcrumbPage>Profile</BreadcrumbPage>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="mx-auto max-w-7xl">
        <UserProfile targetAddress={address} />
      </div>
    </div>
    </ProfileOwnerGuard>
  );
}
