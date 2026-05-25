import Script from 'next/script';
import { getHypelabConfig } from '@/lib/ads/hypelab';

/** Loads HypeLab SDK only when explicitly enabled (avoids 422 on unallowlisted domains). */
export function HypelabSdkScript() {
  const hypelab = getHypelabConfig();
  if (!hypelab.enabled) return null;

  return (
    <Script
      id="hypelab-sdk"
      src={hypelab.sdkUrl}
      strategy="afterInteractive"
      data-property-slug={hypelab.propertySlug}
    />
  );
}
