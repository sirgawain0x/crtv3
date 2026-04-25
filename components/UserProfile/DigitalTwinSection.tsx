"use client";

import { useEffect, useState } from "react";
import { Bot, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useCreatorProfile } from "@/lib/hooks/metokens/useCreatorProfile";
import { useUser } from "@account-kit/react";

interface DigitalTwinSectionProps {
  targetAddress?: string;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const URL_RE = /^https?:\/\//i;

export function DigitalTwinSection({ targetAddress }: DigitalTwinSectionProps) {
  const user = useUser();
  const { toast } = useToast();
  const { profile, loading, upsertProfile } = useCreatorProfile(targetAddress);

  const [enabled, setEnabled] = useState(false);
  const [address, setAddress] = useState("");
  const [glbUrl, setGlbUrl] = useState("");
  const [chatEndpoint, setChatEndpoint] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setEnabled(!!profile.twin_enabled);
    setAddress(profile.twin_address ?? "");
    setGlbUrl(profile.twin_avatar_glb_url ?? "");
    setChatEndpoint(profile.twin_chat_endpoint ?? "");
  }, [profile]);

  const isOwner = !targetAddress || targetAddress === user?.address;

  if (loading) {
    return null;
  }

  if (!isOwner) {
    return null;
  }

  async function handleSave() {
    if (!user?.address) {
      toast({ variant: "destructive", title: "Not connected", description: "Connect your wallet first." });
      return;
    }
    if (enabled && address && !ADDRESS_RE.test(address.trim())) {
      toast({ variant: "destructive", title: "Invalid address", description: "Twin address must be a valid 0x address." });
      return;
    }
    if (glbUrl && !URL_RE.test(glbUrl.trim())) {
      toast({ variant: "destructive", title: "Invalid URL", description: "Avatar URL must start with http(s)://." });
      return;
    }
    if (chatEndpoint && !URL_RE.test(chatEndpoint.trim())) {
      toast({ variant: "destructive", title: "Invalid URL", description: "Chat endpoint must start with http(s)://." });
      return;
    }

    setIsSaving(true);
    try {
      await upsertProfile({
        owner_address: user.address,
        twin_enabled: enabled,
        twin_address: address.trim() || null,
        twin_avatar_glb_url: glbUrl.trim() || null,
        twin_chat_endpoint: chatEndpoint.trim() || null,
      });
      toast({ title: "Digital Twin saved", description: "Your twin settings have been updated." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Failed to save twin settings.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Digital Twin
        </CardTitle>
        <CardDescription>
          Connect a Creative AI Digital Twin to your channel. When you go live,
          your twin's 3D avatar shows in the corner of the player; without an
          avatar, viewers get a chat panel that talks to your twin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable Digital Twin</p>
            <p className="text-xs text-muted-foreground">
              Off until your twin is deployed and ready.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="twin_address">Twin wallet address</Label>
          <Input
            id="twin_address"
            placeholder="0x… (the agent's EVM address)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            This address can be added as a chat moderator on your streams.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="twin_avatar_glb_url">3D avatar URL (.glb)</Label>
          <Input
            id="twin_avatar_glb_url"
            placeholder="https://… or ipfs://… GLB file"
            value={glbUrl}
            onChange={(e) => setGlbUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Renders as a transparent corner overlay on your stream. Leave empty
            to skip the 3D avatar.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="twin_chat_endpoint">Twin chat endpoint (optional)</Label>
          <Input
            id="twin_chat_endpoint"
            placeholder="https://your-twin.example.com/chat"
            value={chatEndpoint}
            onChange={(e) => setChatEndpoint(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            HTTPS endpoint that accepts a POST with{" "}
            <code className="text-[10px]">{"{messages, viewerAddress, streamId}"}</code>{" "}
            and streams a text response. Used when no 3D avatar is set.
          </p>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving…" : "Save Twin Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
