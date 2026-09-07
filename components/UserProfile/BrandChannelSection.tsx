"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useCreatorProfile } from "@/lib/hooks/metokens/useCreatorProfile";
import { useMembershipVerification } from "@/lib/hooks/unlock/useMembershipVerification";
import { hasValidBrandPass } from "@/lib/access/creator-membership";
import {
  BRAND_CHANNELS,
  getBrandChannelPath,
} from "@/lib/channels/brand-channels";
import { Loader2, Tv, AlertCircle, ExternalLink } from "lucide-react";

const NONE_VALUE = "__none__";

interface BrandChannelSectionProps {
  targetAddress?: string;
  onSaved?: () => void;
}

export function BrandChannelSection({
  targetAddress,
  onSaved,
}: BrandChannelSectionProps) {
  const { toast } = useToast();
  const { profile, loading, updateProfile } = useCreatorProfile(targetAddress);
  const { membershipDetails, isLoading: membershipLoading } =
    useMembershipVerification();

  const [selectedSlug, setSelectedSlug] = useState<string>(NONE_VALUE);
  const [isSaving, setIsSaving] = useState(false);

  const hasBrandPass = hasValidBrandPass(membershipDetails);
  const currentSlug = profile?.brand_channel_slug ?? null;
  const channelPath = getBrandChannelPath(currentSlug);

  useEffect(() => {
    setSelectedSlug(currentSlug ?? NONE_VALUE);
  }, [currentSlug]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const nextSlug = selectedSlug === NONE_VALUE ? null : selectedSlug;
      await updateProfile({ brand_channel_slug: nextSlug });
      toast({
        title: nextSlug ? "Channel linked" : "Channel removed",
        description: nextSlug
          ? "Your profile now shows a Channel button for visitors."
          : "Brand channel link cleared from your profile.",
      });
      onSaved?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not save",
        description:
          err instanceof Error ? err.message : "Failed to update brand channel",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasPendingChange =
    (selectedSlug === NONE_VALUE ? null : selectedSlug) !== currentSlug;

  if (loading || membershipLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading brand channel settings…
        </CardContent>
      </Card>
    );
  }

  if (!hasBrandPass) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tv className="h-5 w-5" />
          Brand channel
        </CardTitle>
        <CardDescription>
          Link your Creative TV brand channel so visitors on your creator page
          can open it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {channelPath && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Live link:</span>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={channelPath} target="_blank" rel="noopener noreferrer">
                {channelPath}
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="brand-channel-select">Channel</Label>
          <Select value={selectedSlug} onValueChange={setSelectedSlug}>
            <SelectTrigger id="brand-channel-select">
              <SelectValue placeholder="Select a channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>No channel linked</SelectItem>
              {BRAND_CHANNELS.map((channel) => (
                <SelectItem key={channel.slug} value={channel.slug}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasPendingChange && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Save to update the Channel button on your public creator page.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving || !hasPendingChange}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Tv className="h-4 w-4" />
          )}
          {isSaving ? "Saving…" : "Save channel link"}
        </Button>
      </CardContent>
    </Card>
  );
}
