import { CreatorXmerchSection } from "@/components/Creator/CreatorXmerchSection";

/** Internal preview for QA / PR screenshots (mock creator xMerch block). */
export default function XmerchSocialPreviewPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 text-xl font-semibold">Creator profile preview</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Mock data — xMerch store icon and featured products.
      </p>
      <CreatorXmerchSection
        xmerchStored={{
          storeUrl: "https://creative.xmerch.app",
          featuredProductUrls: [
            "https://creative.xmerch.app/products/sample-product",
          ],
        }}
      />
    </main>
  );
}
