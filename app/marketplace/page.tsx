import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from "lucide-react";

export default function MarketplacePage() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <div className="my-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/marketplace">Marketplace</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
        <p className="text-muted-foreground">
          Browse and purchase IP assets from Creative TV creators.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/marketplace/ip"
          className="rounded-lg border bg-card p-6 hover:bg-accent/50 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">IP Assets</h2>
          <p className="text-sm text-muted-foreground">
            Videos registered as IP on Story Protocol. View on Story or purchase.
          </p>
        </Link>
      </div>
    </div>
  );
}
