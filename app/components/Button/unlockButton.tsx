import Link from "next/link";
import { Button } from "../ui/button";

export interface UnlockSIWEButtonProps {
  redirectUri: string;
  clientId: string;
  paywallConfig?: any
}

export function UnlockSIWEButton({ redirectUri, clientId, paywallConfig }: UnlockSIWEButtonProps) {
  const endpoint = `https://app.unlock-protocol.com/checkout?client_id=${clientId}&redirect_uri=${redirectUri}` + (paywallConfig ? `&paywallConfig=${paywallConfig}` : "")
  return (
    <Link href={endpoint} passHref>
      <Button>
        Sign In
      </Button>
    </Link>
  )
}