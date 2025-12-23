"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { shortenAddress } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AddressWithCopyProps {
  address: string;
  className?: string;
}

export function AddressWithCopy({ address, className }: AddressWithCopyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy address");
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <p className="text-sm text-muted-foreground font-mono">
        {shortenAddress(address)}
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleCopy}
        aria-label="Copy address"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
