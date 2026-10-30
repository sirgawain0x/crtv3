import { unlockService } from "@/lib/sdk/unlock/services";
import { hasValidBrandPass } from "@/lib/access/creator-membership";

/** Server-side Brand Pass check for profile mutations. */
export async function addressHasBrandPass(
  ownerAddress: string
): Promise<boolean> {
  const memberships = await unlockService.getAllMemberships(ownerAddress);
  return hasValidBrandPass(memberships);
}
