export { createLensClient } from "./create-client";
import { createLensClient } from "./create-client";

/**
 * Default client for general usage (no privileged access)
 */
export const publicClient = createLensClient();
