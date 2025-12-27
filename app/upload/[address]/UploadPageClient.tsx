"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useSmartAccountClient } from "@account-kit/react";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import { isAddress } from "viem";

interface UploadPageClientProps {
  urlAddress: string;
  children: React.ReactNode;
}

/**
 * Client component that validates the address in the URL matches the logged-in user's address.
 * If they don't match, redirects to the correct upload page for the logged-in user.
 */
export function UploadPageClient({ urlAddress, children }: UploadPageClientProps) {
  const router = useRouter();
  const { address: scaAddress } = useSmartAccountClient({});
  const { account } = useModularAccount();
  const user = useUser();
  const eoaAddress = user?.address;

  // Use the Smart Account address from useModularAccount as primary source
  const smartAccountAddress = account?.address || scaAddress;

  useEffect(() => {
    // Normalize addresses for comparison (case-insensitive)
    const normalizeAddress = (addr: string | undefined) => 
      addr ? addr.toLowerCase() : null;

    const urlAddr = normalizeAddress(urlAddress);
    const smartAddr = normalizeAddress(smartAccountAddress);
    const eoaAddr = normalizeAddress(eoaAddress);

    // Validate URL address format
    if (urlAddress && !isAddress(urlAddress)) {
      console.warn("Invalid address format in URL, redirecting...");
      if (smartAddr) {
        router.replace(`/upload/${smartAccountAddress}`);
      } else if (eoaAddr) {
        router.replace(`/upload/${eoaAddress}`);
      } else {
        router.replace("/upload");
      }
      return;
    }

    // If we have a smart account address, use that as the primary address
    if (smartAddr) {
      if (urlAddr !== smartAddr) {
        console.log("URL address mismatch, redirecting to Smart Account upload:", smartAccountAddress);
        router.replace(`/upload/${smartAccountAddress}`);
        return;
      }
    } 
    // Fallback to EOA address if no smart account
    else if (eoaAddr) {
      if (urlAddr !== eoaAddr) {
        console.log("URL address mismatch, redirecting to EOA upload:", eoaAddress);
        router.replace(`/upload/${eoaAddress}`);
        return;
      }
    }
    // If no address is available, redirect to base upload page
    else {
      router.replace("/upload");
      return;
    }
  }, [urlAddress, smartAccountAddress, eoaAddress, router, account?.address, scaAddress]);

  return <>{children}</>;
}

