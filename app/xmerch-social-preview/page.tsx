import { CreatorXmerchSection } from "@/components/Creator/CreatorXmerchSection";

/** Internal preview for QA / PR screenshots (mock enabled xMerch block). */
export default function XmerchSocialPreviewPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 text-xl font-semibold">Creator profile preview</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Mock data — admin-enabled xMerch store + featured product.
      </p>
      <CreatorXmerchSection
        xmerchStored={{
          enabled: true,
          storeUrl: "https://creative.xmerch.app",
          featuredProductUrls: [
            "https://creative.xmerch.app/products/sample-product",
          ],
        }}
      />
    </main>
  );
}
