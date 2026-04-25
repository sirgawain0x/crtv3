"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { Bot, AlertCircle, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  creatorProfileSupabaseService,
  type CreatorProfile,
} from "@/lib/sdk/supabase/creator-profiles";
import { logger } from "@/lib/utils/logger";

interface DigitalTwinSectionProps {
  ownerAddress: string;
  /** Initial values, if the parent already loaded the profile. */
  initialProfile?: CreatorProfile | null;
  /** Whether the current viewer can edit (i.e. owns the profile). */
  isOwner: boolean;
  onSaved?: () => void;
}

interface FormState {
  twin_enabled: boolean;
  twin_address: string;
  twin_avatar_glb_url: string;
  twin_chat_endpoint: string;
}

const EMPTY_FORM: FormState = {
  twin_enabled: false,
  twin_address: "",
  twin_avatar_glb_url: "",
  twin_chat_endpoint: "",
};

function formFromProfile(p?: CreatorProfile | null): FormState {
  if (!p) return EMPTY_FORM;
  return {
    twin_enabled: !!p.twin_enabled,
    twin_address: p.twin_address || "",
    twin_avatar_glb_url: p.twin_avatar_glb_url || "",
    twin_chat_endpoint: p.twin_chat_endpoint || "",
  };
}

/**
 * Profile-page section for declaring an external Creative AI Digital Twin.
 *
 * The agent itself is hosted off-platform (e.g. on Pinata) — this only
 * stores the address + GLB URL + chat endpoint so the watch/live pages can
 * render an overlay and the chat-proxy route can forward Q&A to it.
 */
export function DigitalTwinSection({
  ownerAddress,
  initialProfile,
  isOwner,
  onSaved,
}: DigitalTwinSectionProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => formFromProfile(initialProfile));
  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile !== undefined) {
      setForm(formFromProfile(initialProfile));
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await creatorProfileSupabaseService.getCreatorProfileByOwner(ownerAddress);
        if (!cancelled) setForm(formFromProfile(p));
      } catch (err) {
        logger.error("Failed to load profile for twin section:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerAddress, initialProfile]);

  const validate = (): string | null => {
    if (!form.twin_enabled) return null;
    if (form.twin_address && !isAddress(form.twin_address)) {
      return "Twin address must be a valid 0x address";
    }
    if (
      form.twin_chat_endpoint &&
      !/^https:\/\//i.test(form.twin_chat_endpoint)
    ) {
      return "Chat endpoint must use https://";
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await creatorProfileSupabaseService.upsertCreatorProfile({
        owner_address: ownerAddress,
        twin_enabled: form.twin_enabled,
        twin_address: form.twin_address.trim() ? form.twin_address.trim().toLowerCase() : null,
        twin_avatar_glb_url: form.twin_avatar_glb_url.trim() || null,
        twin_chat_endpoint: form.twin_chat_endpoint.trim() || null,
      });
      toast({ title: "Twin settings saved" });
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save twin settings";
      setError(msg);
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Creative AI Digital Twin
        </CardTitle>
        <CardDescription>
          Connect an external AI agent (your "twin") that appears as a 3D avatar
          alongside your stream and answers viewer questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-semibold">Enable digital twin</p>
                <p className="text-xs text-muted-foreground">
                  When on, viewers see your twin overlay during streams.
                </p>
              </div>
              <Switch
                checked={form.twin_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, twin_enabled: v }))}
                disabled={!isOwner || saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twin_address">Twin wallet address</Label>
              <Input
                id="twin_address"
                placeholder="0x… (the agent's EVM address)"
                value={form.twin_address}
                onChange={(e) => setForm((f) => ({ ...f, twin_address: e.target.value }))}
                disabled={!isOwner || saving || !form.twin_enabled}
              />
              <p className="text-xs text-muted-foreground">
                Used to identify your twin for moderation and on-chain actions.
                You can grant it moderation rights from the Manage Moderators
                dialog on your live page.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twin_avatar_glb_url">Avatar GLB URL</Label>
              <Input
                id="twin_avatar_glb_url"
                placeholder="https://… or ipfs://… (.glb file)"
                value={form.twin_avatar_glb_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, twin_avatar_glb_url: e.target.value }))
                }
                disabled={!isOwner || saving || !form.twin_enabled}
              />
              <p className="text-xs text-muted-foreground">
                Public URL to a GLB asset (Tripo3D output works directly). Leave
                blank to fall back to the chat panel.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twin_chat_endpoint">Chat endpoint (optional)</Label>
              <Input
                id="twin_chat_endpoint"
                placeholder="https://your-agent.example.com/chat"
                value={form.twin_chat_endpoint}
                onChange={(e) =>
                  setForm((f) => ({ ...f, twin_chat_endpoint: e.target.value }))
                }
                disabled={!isOwner || saving || !form.twin_enabled}
              />
              <p className="text-xs text-muted-foreground">
                HTTPS POST endpoint your agent exposes. Receives JSON with{" "}
                <code className="text-[10px]">creatorAddress</code>,{" "}
                <code className="text-[10px]">message</code>, and{" "}
                <code className="text-[10px]">streamId</code>; should reply with{" "}
                <code className="text-[10px]">{"{ reply: string }"}</code>.
              </p>
            </div>

            {isOwner && (
              <div className="pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save twin settings
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
