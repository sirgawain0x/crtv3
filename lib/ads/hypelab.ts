/**
 * HypeLab ad SDK config.
 *
 * api.hypelab.com returns 422 when the request Referer/Origin is not allowlisted
 * for the property in the HypeLab dashboard. Opt in with NEXT_PUBLIC_HYPELAB_ENABLED=true
 * after adding your site (e.g. https://tv.creativeplatform.xyz) in HypeLab.
 */
export function getHypelabConfig() {
  const propertySlug = process.env.NEXT_PUBLIC_HYPELAB_PROPERTY_SLUG?.trim() ?? '';
  const placementSlug =
    process.env.NEXT_PUBLIC_HYPELAB_PLACEMENT_SLUG?.trim() ?? '';
  const enabled =
    process.env.NEXT_PUBLIC_HYPELAB_ENABLED === 'true' &&
    propertySlug.length > 0 &&
    placementSlug.length > 0;

  return {
    enabled,
    propertySlug,
    placementSlug,
    sdkUrl: 'https://api.hypelab.com/v1/scripts/sdk.js',
  } as const;
}
