"use client";
import { useEffect } from "react";
import { useUser, useSmartAccountClient } from "@account-kit/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";

function UploadRedirect() {
  const router = useRouter();
  const { address: scaAddress } = useSmartAccountClient({});
  const { account } = useModularAccount();
  const user = useUser();
  const eoaAddress = user?.address;
  
  // Use the Smart Account address from useModularAccount as primary source
  const smartAccountAddress = account?.address || scaAddress;

  useEffect(() => {
    console.log('Upload redirect - EOA:', eoaAddress, 'SCA (client):', scaAddress, 'SCA (account):', account?.address);
    if (smartAccountAddress) {
      console.log('Redirecting to Smart Account upload:', smartAccountAddress);
      router.replace(`/upload/${smartAccountAddress}`);
    } else if (eoaAddress) {
      console.log('Redirecting to EOA upload:', eoaAddress);
      router.replace(`/upload/${eoaAddress}`);
    }
  }, [eoaAddress, smartAccountAddress, router, account?.address, scaAddress]);

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-32 rounded" />
    </div>
  );
}

export default UploadRedirect;
