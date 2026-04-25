"use client";

import { useRef, useState, useEffect, type FormEvent } from "react";
import { Bot, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";

interface TwinChatPanelProps {
  creatorAddress: string;
  streamId: string;
  twinName?: string;
  className?: string;
}

interface TwinMessage {
  id: string;
  role: "user" | "twin";
  content: string;
}

export function TwinChatPanel({
  creatorAddress,
  streamId,
  twinName,
  className,
}: TwinChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TwinMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg: TwinMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/twin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress,
          streamId,
          message: trimmed,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Twin chat failed (${res.status})`);
      }

      const data = await res.json();
      const reply = typeof data?.reply === "string" ? data.reply : "(no response)";
      setMessages((prev) => [
        ...prev,
        { id: `t-${Date.now()}`, role: "twin", content: reply },
      ]);
    } catch (err) {
      logger.error("Twin chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `t-err-${Date.now()}`,
          role: "twin",
          content:
            err instanceof Error
              ? err.message
              : "Twin is offline right now. Try again later.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full px-4 py-2 bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity",
          className
        )}
      >
        <Bot className="h-4 w-4" />
        <span className="text-sm font-medium">
          Chat with {twinName ?? "the host's twin"}
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-30 w-[320px] max-w-[calc(100vw-2rem)] rounded-lg border bg-background shadow-xl flex flex-col h-[420px]",
        className
      )}
    >
      <div className="flex items-center justify-between border-b p-2 bg-muted/50">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            {twinName ?? "Digital Twin"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1 rounded hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">
            Ask {twinName ?? "the twin"} anything while you watch.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs max-w-[85%]",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-muted"
              )}
            >
              {msg.content}
            </div>
          ))
        )}
        {sending && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t p-2 flex gap-2 bg-muted/30">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={sending}
          className="flex-1 text-sm h-8"
          maxLength={500}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim() || sending}
          className="h-8"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
