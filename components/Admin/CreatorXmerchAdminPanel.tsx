"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  MAX_XMERCH_FEATURED_PRODUCTS,
  validateAndNormalizeXmerchProfileInput,
} from "@/lib/creator/xmerch-profile";
import { usePlatformAdmin } from "@/lib/hooks/admin/usePlatformAdmin";
import { usePlatformAdminWalletAuth } from "@/lib/hooks/admin/usePlatformAdminWalletAuth";

export function CreatorXmerchAdminPanel() {
  const { toast } = useToast();
  const { adminAuthAddress } = usePlatformAdmin();
  const { getAuthHeaders, isReady } = usePlatformAdminWalletAuth(adminAuthAddress);
  const [ownerAddress, setOwnerAddress] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");
  const [featuredLines, setFeaturedLines] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const featuredProductUrls = featuredLines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const validation = validateAndNormalizeXmerchProfileInput({
      enabled,
      storeUrl,
      featuredProductUrls,
    });

    if (!validation.ok) {
      setFieldErrors(validation.errors);
      toast({
        variant: "destructive",
        title: "Invalid xMerch data",
        description: Object.values(validation.errors)[0],
      });
      return;
    }
    setFieldErrors({});

    if (!ownerAddress.trim()) {
      toast({
        variant: "destructive",
        title: "Creator address required",
      });
      return;
    }

    if (!isReady) {
      toast({
        variant: "destructive",
        title: "Connect wallet",
        description: "Sign in with the platform admin wallet to save.",
      });
      return;
    }

    setSaving(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/creator-profiles/admin/xmerch", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          owner_address: ownerAddress.trim(),
          social_xmerch: validation.value,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Save failed");
      }

      const saved = validation.value;
      let savedDescription = "Creative Merch hidden for this creator.";
      if (enabled) {
        const hasFeatured = saved.featuredProductUrls.length > 0;
        const hasStore = Boolean(saved.storeUrl);
        if (hasFeatured && hasStore) {
          savedDescription =
            "Public profile shows featured product cards (up to 3). The store URL is saved; featured items take the profile slot.";
        } else if (hasFeatured) {
          savedDescription =
            "Public profile will show featured product cards with images (or the xMerch icon when no image is available).";
        } else if (hasStore) {
          savedDescription =
            "Public profile will show the xMerch store button.";
        }
      }

      toast({
        title: "xMerch profile saved",
        description: savedDescription,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-lg border p-6">
      <div>
        <h1 className="text-xl font-semibold">Creator xMerch (invite-only)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform admin only. Set a store URL, featured product URLs, or both. On the public
          profile these are different displays: the store button, or up to{" "}
          {MAX_XMERCH_FEATURED_PRODUCTS} featured product cards. If featured products are set,
          they are shown instead of the store button.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_address">Creator wallet address</Label>
        <Input
          id="owner_address"
          placeholder="0x…"
          value={ownerAddress}
          onChange={(e) => setOwnerAddress(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="xmerch_enabled"
          checked={enabled}
          onCheckedChange={(checked: boolean) => setEnabled(checked)}
        />
        <Label htmlFor="xmerch_enabled">Active Creative Merch product</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="xmerch_store">Store URL (store button on profile)</Label>
        <Input
          id="xmerch_store"
          placeholder="https://yourstore.xmerch.app"
          value={storeUrl}
          onChange={(e) => setStoreUrl(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="xmerch_featured">
          Featured product URLs (product cards on profile)
        </Label>
        <Textarea
          id="xmerch_featured"
          rows={4}
          placeholder={`One product page URL per line (max ${MAX_XMERCH_FEATURED_PRODUCTS})`}
          value={featuredLines}
          onChange={(e) => setFeaturedLines(e.target.value)}
          aria-invalid={Boolean(fieldErrors.social_xmerch_featured)}
          aria-describedby={
            fieldErrors.social_xmerch_featured ? "xmerch_featured-error" : undefined
          }
        />
        {fieldErrors.social_xmerch_featured ? (
          <p id="xmerch_featured-error" className="text-sm text-destructive" role="alert">
            {fieldErrors.social_xmerch_featured}
          </p>
        ) : null}
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save xMerch profile"}
      </Button>
    </div>
  );
}
