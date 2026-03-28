/**
 * Unlock Protocol Paywall Configuration
 * Based on: https://app.unlock-protocol.com/checkout?id=fce0c0fb-2c39-4912-807f-e5f64a9276e0
 */

const UNLOCK_PAYWALL_CHECKOUT_ID = "fce0c0fb-2c39-4912-807f-e5f64a9276e0";
const UNLOCK_PAYWALL_BASE_URL = "https://app.unlock-protocol.com/checkout";

export interface MetadataInput {
    name: string;
    type: "text" | "date" | "color" | "email" | "url" | "hidden" | "checkbox";
    required: boolean;
    defaultValue?: string;
    value?: string;
    public?: boolean;
    placeholder?: string;
}

export interface UnlockPaywallConfig {
    icon?: string;
    locks: Record<
        string,
        {
            name?: string;
            order?: number;
            network: number;
            recipient?: string;
            dataBuilder?: string;
            emailRequired?: boolean;
            maxRecipients?: number | null;
            recurringPayments?: string;
        }
    >;
    title?: string;
    referrer?: string;
    skipSelect?: boolean;
    hideSoldOut?: boolean;
    pessimistic?: boolean;
    redirectUri?: string;
    skipRecipient?: boolean;
    endingCallToAction?: string;
    persistentCheckout?: boolean;
    metadataInputs?: MetadataInput[];
}

/**
 * Generate Unlock Protocol paywall checkout URL with referrer support
 * @param referrerAddress - The wallet address of the referrer (optional)
 * @param redirectUri - Custom redirect URI after purchase (optional)
 * @returns The full checkout URL with referrer parameter
 */
export function getUnlockPaywallCheckoutUrl(
    referrerAddress?: `0x${string}`,
    redirectUri?: string,
): string {
    const params = new URLSearchParams();
    params.set("id", UNLOCK_PAYWALL_CHECKOUT_ID);

    // Add referrer if provided
    if (referrerAddress) {
        params.set("referrer", referrerAddress);
    }

    // Add redirect URI if provided
    if (redirectUri) {
        params.set("redirectUri", redirectUri);
    }

    return `${UNLOCK_PAYWALL_BASE_URL}?${params.toString()}`;
}

/**
 * Get the default paywall configuration
 */
export function getDefaultPaywallConfig(): UnlockPaywallConfig {
    return {
        icon: "https://storage.unlock-protocol.com/b1ff133a-2cfc-4f9c-a305-29d878ba4b86",
        locks: {
            "0x13b818daf7016b302383737ba60c3a39fef231cf": {
                name: "",
                order: 1,
                network: 8453,
                recipient: "",
                dataBuilder: "",
                emailRequired: true,
                maxRecipients: null,
            },
            "0x9c3744c96200a52d05a630d4aec0db707d7509be": {
                name: "",
                order: 3,
                network: 8453,
                recipient: "",
                dataBuilder: "",
                emailRequired: true,
                maxRecipients: null,
            },
            "0xf7c4cd399395d80f9d61fde833849106775269c6": {
                name: "",
                order: 0,
                network: 8453,
                recipient: "",
                dataBuilder: "",
                emailRequired: true,
                maxRecipients: null,
                recurringPayments: "forever",
            },
        },
        title: "Creative Membership Passes",
        skipSelect: false,
        hideSoldOut: false,
        pessimistic: true,
        redirectUri: "https://join.creativeplatform.xyz",
        skipRecipient: true,
        endingCallToAction: "Complete",
        persistentCheckout: false,
    };
}

/**
 * Generate paywall config with referrer
 */
export function getPaywallConfigWithReferrer(
    referrerAddress: `0x${string}`,
    redirectUri?: string,
): UnlockPaywallConfig {
    const config = getDefaultPaywallConfig();
    config.referrer = referrerAddress;
    if (redirectUri) {
        config.redirectUri = redirectUri;
    }
    return config;
}

/**
 * Generate Unlock Protocol checkout URL with referrer using paywallConfig approach
 * This creates a programmatic checkout URL that includes the referrer address
 * and email metadata collection.
 * 
 * @param referrerAddress - The wallet address of the referrer (holder)
 * @param redirectUri - Custom redirect URI after purchase (optional, defaults to the one in config)
 * @returns The full checkout URL with paywallConfig and referrerAddress parameters
 */
export function generateCheckoutUrlWithReferrer(
    referrerAddress: `0x${string}`,
    redirectUri?: string,
): string {
    // Get the default config and customize it
    const config = getDefaultPaywallConfig();

    // Set the referrer in the config object
    config.referrer = referrerAddress;

    // Add email metadata collection
    config.metadataInputs = [
        {
            name: "Email",
            type: "email",
            required: true,
            public: false,
            placeholder: "your@email.com",
        },
    ];

    // Override redirect URI if provided
    if (redirectUri) {
        config.redirectUri = redirectUri;
    }

    // Build the URL with paywallConfig approach
    // URL-encode the paywallConfig JSON using encodeURIComponent as per plan
    const paywallConfigJson = JSON.stringify(config);
    const encodedPaywallConfig = encodeURIComponent(paywallConfigJson);

    // URL-encode the redirectUri
    const finalRedirectUri = config.redirectUri || "https://join.creativeplatform.xyz";
    const encodedRedirectUri = encodeURIComponent(finalRedirectUri);

    // Construct the full checkout URL with all parameters
    return `${UNLOCK_PAYWALL_BASE_URL}?paywallConfig=${encodedPaywallConfig}&redirectUri=${encodedRedirectUri}&referrerAddress=${referrerAddress}`;
}
