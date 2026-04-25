"use client";

import { useEffect, useState } from "react";
import { useUser } from "@account-kit/react";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import { toast } from "sonner";
import { Trash2, Bot, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAddress } from "@/lib/helpers";
import {
  addModerator,
  getModerationState,
  removeModerator,
} from "@/services/stream-moderation";
import { creatorProfileSupabaseService } from "@/lib/sdk/supabase/creator-profiles";

interface ModeratorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamId: string;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function ModeratorsDialog({
  open,
  onOpenChange,
  streamId,
}: ModeratorsDialogProps) {
  const user = useUser();
  const { address: smartAccountAddress } = useModularAccount();
  const callerAddress = (smartAccountAddress || user?.address || "").toLowerCase();

  const [moderators, setModerators] = useState<string[]>([]);
  const [twinAddress, setTwinAddress] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyAddress, setBusyAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [state, profile] = await Promise.all([
          getModerationState(streamId),
          callerAddress
            ? creatorProfileSupabaseService
                .getCreatorProfileByOwner(callerAddress)
                .catch(() => null)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setModerators(state.moderators);
        setTwinAddress(
          profile?.twin_enabled && profile?.twin_address
            ? profile.twin_address.toLowerCase()
            : null
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, streamId, callerAddress]);

  async function handleAdd(addr: string) {
    if (!ADDRESS_RE.test(addr)) {
      toast.error("Enter a valid 0x address");
      return;
    }
    if (!callerAddress) {
      toast.error("Connect your wallet first");
      return;
    }
    const normalized = addr.toLowerCase();
    setBusyAddress(normalized);
    try {
      await addModerator(streamId, normalized, callerAddress);
      setModerators((prev) =>
        prev.includes(normalized) ? prev : [...prev, normalized]
      );
      setInput("");
      toast.success(`${formatAddress(normalized)} added as moderator`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add moderator"
      );
    } finally {
      setBusyAddress(null);
    }
  }

  async function handleRemove(addr: string) {
    if (!callerAddress) return;
    setBusyAddress(addr);
    try {
      await removeModerator(streamId, addr, callerAddress);
      setModerators((prev) => prev.filter((a) => a !== addr));
      toast.success(`${formatAddress(addr)} removed`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove moderator"
      );
    } finally {
      setBusyAddress(null);
    }
  }

  const twinAlreadyMod = twinAddress ? moderators.includes(twinAddress) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Chat Moderators</DialogTitle>
          <DialogDescription>
            Appoint addresses that can hide messages and ban users in this
            stream's chat. You're always a moderator implicitly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {twinAddress && !twinAlreadyMod && (
            <div className="rounded-md border bg-muted/40 p-3 flex items-start gap-3">
              <Bot className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1 text-xs">
                <p className="font-medium">Your Digital Twin is configured</p>
                <p className="text-muted-foreground">
                  Add it as a moderator so it can auto-moderate while you
                  stream.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleAdd(twinAddress)}
                disabled={busyAddress === twinAddress}
              >
                {busyAddress === twinAddress ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Add Twin"
                )}
              </Button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd(input.trim());
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0x… address"
              className="font-mono text-xs"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || busyAddress === input.trim().toLowerCase()}
            >
              Add
            </Button>
          </form>

          <div className="border rounded-md max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading…
              </div>
            ) : moderators.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No additional moderators yet.
              </div>
            ) : (
              <ul className="divide-y">
                {moderators.map((addr) => {
                  const isTwin = addr === twinAddress;
                  return (
                    <li
                      key={addr}
                      className="flex items-center justify-between p-2 text-xs"
                    >
                      <span className="flex items-center gap-2 font-mono">
                        {isTwin && <Bot className="h-3 w-3 text-muted-foreground" />}
                        {formatAddress(addr)}
                        {isTwin && (
                          <span className="text-[10px] text-muted-foreground">
                            (twin)
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(addr)}
                        disabled={busyAddress === addr}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500"
                        title="Remove moderator"
                      >
                        {busyAddress === addr ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
