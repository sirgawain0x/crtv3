"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  ShieldCheck,
  FileText,
  AlertCircle,
  ExternalLink,
  Lock,
  Music,
  Scale,
} from "lucide-react";
import { useUploadAttestation } from "@/lib/hooks/eas/useUploadAttestation";
import {
  UPLOAD_ATTESTATION_TERMS_URL,
  UPLOAD_ATTESTATION_TERMS_VERSION,
} from "@/lib/eas/config";
import { logger } from "@/lib/utils/logger";

interface UploadAttestationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified?: () => void;
}

const TERMS_SECTIONS = [
  {
    icon: Lock,
    title: "Wallet as Your Signature",
    body: "Connecting your wallet acts as your unique identifier and binding electronic signature. You control the keys and are responsible for their security.",
  },
  {
    icon: Music,
    title: "You Keep Your Rights",
    body: "You retain 100% ownership of your intellectual property. Creative TV does not claim ownership of your music, visuals, or creative work. You only grant the minimum rights needed to host and display your content on the platform.",
  },
  {
    icon: Scale,
    title: "You Own What You Upload",
    body: "You warrant that every upload is original or that you have all necessary rights, licenses, and clearances. You are solely responsible for any claims that arise from content you upload.",
  },
  {
    icon: FileText,
    title: "Data & Privacy",
    body: "Public on-chain records are permanent. Off-chain personal data is owned by you and handled under applicable privacy laws. Your work will not train AI/ML models without your explicit opt-in consent.",
  },
];

export function UploadAttestationModal({
  open,
  onOpenChange,
  onVerified,
}: UploadAttestationModalProps) {
  const { status, error, signAttestation, isAttested, isLoading } = useUploadAttestation();
  const [confirmed, setConfirmed] = useState(false);

  const handleSign = async () => {
    if (!confirmed) return;
    const result = await signAttestation();
    if (result) {
      logger.debug("Upload attestation verified:", result.uid);
      onVerified?.();
      setTimeout(() => onOpenChange(false), 1500);
    }
  };

  const renderBody = () => {
    if (isAttested) {
      return (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold">Attestation Confirmed</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your upload-rights attestation is on-chain. You can now upload media to Creative TV.
          </p>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Continue to Upload</Button>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold">Attestation Failed</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {error || "Something went wrong while confirming your attestation."}
          </p>
          <Button onClick={handleSign} variant="outline" className="w-full sm:w-auto">Try Again</Button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary opacity-80" />
            </div>
          </div>
          <h3 className="text-lg font-semibold">
            {status === "checking" && "Checking attestation..."}
            {status === "signing" && "Signing attestation..."}
            {status === "submitting" && "Submitting to Base..."}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {status === "checking"
              ? "We're checking if you've already signed the upload-rights attestation."
              : "Please confirm the transaction in your wallet. Gas is sponsored by Creative TV."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
        <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
          {TERMS_SECTIONS.map((section) => (
            <div key={section.title} className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                <section.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{section.title}</p>
                <p className="text-xs text-muted-foreground">{section.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Official Terms of Service</p>
            <p className="text-xs text-muted-foreground">
              Version {UPLOAD_ATTESTATION_TERMS_VERSION}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a
              href={UPLOAD_ATTESTATION_TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Read Full Terms
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="upload-terms"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="upload-terms" className="text-sm font-medium cursor-pointer">
              I certify and attest
            </Label>
            <p className="text-xs text-muted-foreground">
              I have read and agree to the{' '}
              <a href={UPLOAD_ATTESTATION_TERMS_URL} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                Creative TV Terms of Service
              </a>
              . I confirm I own full copyrights to this content, it is 100% original or fully licensed, and Creative TV does not take ownership of my work. I am solely responsible for any claims arising from this upload.
            </p>
          </div>
        </div>

        <Button onClick={handleSign} disabled={!confirmed} className="w-full">
          <ShieldCheck className="mr-2 h-4 w-4" />
          Sign On-Chain Attestation
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Upload Rights Attestation
          </DialogTitle>
          <DialogDescription>
            Confirm ownership, originality, and acceptance of the Creative TV terms before uploading media.
          </DialogDescription>
        </DialogHeader>
        {renderBody()}
      </DialogContent>
    </Dialog>
  );
}
