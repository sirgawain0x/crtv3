"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, X, Film, ImageIcon, AlertCircle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GroveVideoUploader } from "@/components/songchain/GroveVideoUploader";
import { SongCupAttestationModal } from "@/components/eas/SongCupAttestationModal";
import { SongCupAdminSubmissionsList } from "@/components/songchain/song-cup/SongCupAdminSubmissionsList";
import { useSongCupAttestation } from "@/lib/hooks/eas/useSongCupAttestation";
import { ipfsService } from "@/lib/sdk/ipfs/service";
import { songCupSubmissionsService } from "@/lib/sdk/supabase/song-cup-submissions";
import { useUser } from "@/lib/wallet/react";
import type { VideoAsset } from "@/lib/types/video-asset";
import { cn } from "@/lib/utils/utils";
import { toast } from "sonner";
import {
  songCupAccent,
  songCupAccentYellow,
  songCupAdminSection,
  songCupBody,
  songCupCheckboxClass,
  songCupCheckboxMark,
  songCupDashedUpload,
  songCupField,
  songCupFormCard,
  songCupGradientCta,
  songCupMuted,
  songCupPanel,
  songCupPanelInset,
} from "@/lib/songchain/song-cup/panel-styles";

type SongCupSubmitPanelProps = {
  className?: string;
};

type CoverAsset = {
  url: string;
  name: string;
};

function SongCupCheckbox({
  id,
  label,
  checked,
  onChange,
  className,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn("flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground dark:text-white", className)}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cn(songCupCheckboxClass, songCupCheckboxMark)}
      />
      {label}
    </label>
  );
}

function buildSubmissionDescription({
  artistHandle,
  email,
  description,
  coverUrl,
  tuneBooAi,
  attestationUid,
}: {
  artistHandle: string;
  email: string;
  description: string;
  coverUrl?: string;
  tuneBooAi: boolean;
  attestationUid?: string;
}) {
  const lines = [
    description.trim(),
    artistHandle.trim() ? `Handle: ${artistHandle.trim()}` : "",
    email.trim() ? `Email: ${email.trim()}` : "",
    coverUrl ? `Cover: ${coverUrl}` : "",
    tuneBooAi ? "Tune Boo AI: opted in" : "",
    attestationUid ? `Attestation: ${attestationUid}` : "",
  ].filter(Boolean);
  return lines.join("\n\n");
}

export function SongCupSubmitPanel({ className }: SongCupSubmitPanelProps) {
  const user = useUser();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [attestationModalOpen, setAttestationModalOpen] = useState(false);
  const { isAttested, isLoading: isAttestationLoading, attestation } = useSongCupAttestation();

  const [artistName, setArtistName] = useState("");
  const [artistHandle, setArtistHandle] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [tuneBooAi, setTuneBooAi] = useState(false);
  const [uploadVideoEnabled, setUploadVideoEnabled] = useState(false);
  const [uploadCoverEnabled, setUploadCoverEnabled] = useState(false);
  const [uploadedVideoAsset, setUploadedVideoAsset] = useState<Partial<VideoAsset> | null>(null);
  const [coverAsset, setCoverAsset] = useState<CoverAsset | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploadCoverFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setCoverError("Please select an image file.");
      return;
    }
    setIsUploadingCover(true);
    setCoverError(null);
    try {
      const result = await ipfsService.uploadFile(file);
      if (!result.success || !result.url) {
        throw new Error(result.error || "Cover upload failed");
      }
      setCoverAsset({ url: result.url, name: file.name });
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : "Cover upload failed");
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setArtistName("");
    setArtistHandle("");
    setEmail("");
    setDescription("");
    setTuneBooAi(false);
    setUploadVideoEnabled(false);
    setUploadCoverEnabled(false);
    setUploadedVideoAsset(null);
    setCoverAsset(null);
    setCoverError(null);
  };

  const handleSubmit = async () => {
    if (!user?.address) {
      toast.error("Connect your wallet to submit.");
      return;
    }
    if (!isAttested) {
      toast.error("Please sign the Terms & Conditions attestation before submitting.");
      setAttestationModalOpen(true);
      return;
    }
    if (!artistName.trim()) {
      toast.error("Artist name is required.");
      return;
    }
    if (!uploadVideoEnabled || !uploadedVideoAsset?.location) {
      toast.error("Enable Upload Video and add your entry video.");
      return;
    }
    if (uploadCoverEnabled && !coverAsset?.url) {
      toast.error("Upload a cover image or uncheck Upload Cover image.");
      return;
    }

    setIsSubmitting(true);
    try {
      const row = await songCupSubmissionsService.create({
        wallet_address: user.address,
        grove_url: uploadedVideoAsset.location,
        grove_hash: uploadedVideoAsset.metadata_uri ?? undefined,
        title: artistName.trim(),
        description: buildSubmissionDescription({
          artistHandle,
          email,
          description,
          coverUrl: coverAsset?.url,
          tuneBooAi,
          attestationUid: attestation?.uid,
        }),
      });

      if (!row) {
        toast.error("Submission failed. Please try again.");
        return;
      }

      toast.success("Entry submitted successfully!");
      resetForm();
    } catch (err) {
      console.error("Song Cup submission failed", err);
      toast.error("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = cn(songCupField, "h-[41px]");

  return (
    <div className={cn("relative overflow-hidden p-4 sm:p-6", songCupPanel, className)}>
      <img
        src="/songchain/song-cup/submit-corner-ornament.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-2 hidden h-24 w-24 rotate-180 object-contain sm:block"
      />
      <img
        src="/songchain/song-cup/submit-corner-ornament.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-2 -right-2 hidden h-24 w-24 object-contain sm:block"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <img
            src="/songchain/button-icons/submit-icon.svg"
            alt="Submit"
            className="h-[120px] w-[120px] object-contain sm:h-[140px] sm:w-[140px]"
          />

          <div className={cn("relative mx-auto w-full max-w-[327px]", songCupFormCard)}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="artist-name" className={cn("text-sm font-medium", songCupBody)}>
                  Artist Name
                </label>
                <Input
                  id="artist-name"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  disabled={isSubmitting}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="artist-handle" className={cn("text-sm font-medium", songCupBody)}>
                  Artist Handle
                </label>
                <Input
                  id="artist-handle"
                  value={artistHandle}
                  onChange={(e) => setArtistHandle(e.target.value)}
                  disabled={isSubmitting}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className={cn("text-sm font-medium", songCupBody)}>
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="description" className={cn("text-sm font-medium", songCupBody)}>
                  Description about the track
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className={cn(fieldClass, "min-h-[85px] resize-none py-3")}
                />
              </div>

              <div className="space-y-2 pt-1">
                <SongCupCheckbox
                  id="tune-boo-ai"
                  label="tune boo ai helps you"
                  checked={tuneBooAi}
                  onChange={setTuneBooAi}
                  className="uppercase tracking-wide"
                />

                <div className={cn("rounded-[16px] border p-3", songCupPanelInset)}>
                  {isAttestationLoading ? (
                    <div className={cn("flex items-center gap-2 text-sm", songCupMuted)}>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking terms attestation…
                    </div>
                  ) : isAttested ? (
                    <div className={cn("flex items-center gap-2 text-sm", songCupBody)}>
                      <CheckCircle2 className={cn("h-5 w-5 shrink-0", songCupAccentYellow)} />
                      Terms &amp; Conditions attestation confirmed
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className={cn("text-sm", songCupMuted)}>
                        Sign an on-chain attestation to agree to the Terms &amp; Conditions before
                        submitting your entry.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAttestationModalOpen(true)}
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Sign Terms Attestation
                      </Button>
                    </div>
                  )}
                </div>

                <SongCupCheckbox
                  id="upload-video"
                  label="Upload Video"
                  checked={uploadVideoEnabled}
                  onChange={(checked) => {
                    setUploadVideoEnabled(checked);
                    if (!checked) setUploadedVideoAsset(null);
                  }}
                />
                <SongCupCheckbox
                  id="upload-cover"
                  label="Upload Cover image"
                  checked={uploadCoverEnabled}
                  onChange={(checked) => {
                    setUploadCoverEnabled(checked);
                    if (!checked) setCoverAsset(null);
                  }}
                />
              </div>

              {uploadVideoEnabled && (
                <div className={cn("rounded-[20px] p-3", songCupPanelInset)}>
                  <GroveVideoUploader
                    onUploaded={setUploadedVideoAsset}
                    onRemove={() => setUploadedVideoAsset(null)}
                    uploadedAsset={uploadedVideoAsset}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {uploadCoverEnabled && (
                <div className={cn("space-y-2 rounded-[20px] p-3", songCupPanelInset)}>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isSubmitting || isUploadingCover}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadCoverFile(file);
                    }}
                  />
                  {coverAsset ? (
                    <div className="flex items-start gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                        <img
                          src={coverAsset.url}
                          alt={coverAsset.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm font-medium", songCupBody)}>{coverAsset.name}</p>
                        <p className={cn("text-xs", songCupMuted)}>Uploaded via Grove/IPFS</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setCoverAsset(null)}
                        aria-label="Remove cover image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting || isUploadingCover}
                      onClick={() => coverInputRef.current?.click()}
                      className={cn(
                        "flex w-full flex-col items-center justify-center gap-2 rounded-md p-4 disabled:opacity-60",
                        songCupDashedUpload,
                      )}
                    >
                      {isUploadingCover ? (
                        <Loader2 className={cn("h-6 w-6 animate-spin", songCupAccent)} />
                      ) : (
                        <ImageIcon className="h-6 w-6" />
                      )}
                      <span className="text-sm">
                        {isUploadingCover ? "Uploading cover…" : "Click to upload cover image"}
                      </span>
                    </button>
                  )}
                  {coverError && (
                    <p className="flex items-center gap-1.5 text-xs text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      {coverError}
                    </p>
                  )}
                </div>
              )}

              {!user?.address && (
                <p className={cn("text-xs", songCupMuted)}>Connect your wallet to submit an entry.</p>
              )}

              <Button
                type="button"
                disabled={isSubmitting || !isAttested}
                onClick={() => void handleSubmit()}
                className={cn("mx-auto mt-2 flex h-10 w-[160px] disabled:opacity-50", songCupGradientCta)}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                SUBMIT
              </Button>
            </div>
          </div>
        </div>

        <aside className="flex shrink-0 flex-col items-center gap-4 lg:pt-16">
          <div className="relative h-[125px] w-[131px] overflow-hidden rounded-[15px]">
            <Image
              src="/songchain/song-cup/submit-qr.png"
              alt="Song Cup QR code"
              fill
              className="object-cover"
              sizes="131px"
            />
          </div>
          {uploadedVideoAsset?.location && (
            <div className={cn("flex items-center gap-2 text-xs", songCupAccent)}>
              <Film className="h-4 w-4" />
              Video ready
            </div>
          )}
        </aside>
      </div>

      <SongCupAdminSubmissionsList className="mt-6" />

      <SongCupAttestationModal
        open={attestationModalOpen}
        onOpenChange={setAttestationModalOpen}
        onVerified={() => setAttestationModalOpen(false)}
      />
    </div>
  );
}
