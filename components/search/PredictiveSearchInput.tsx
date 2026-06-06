"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2 } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utils/utils";

export type SearchScope = "videos" | "market" | "predictions";

type SuggestResult = {
  id?: string;
  questionId?: string;
  address?: string;
  title: string;
  subtitle?: string;
  href: string;
};

const SCOPE_ENDPOINT: Record<SearchScope, string> = {
  videos: "/api/search/videos",
  market: "/api/search/market",
  predictions: "/api/search/predictions",
};

interface PredictiveSearchInputProps {
  scope: SearchScope;
  placeholder?: string;
  value?: string;
  onQueryChange: (query: string) => void;
  onSelect?: (result: SuggestResult) => void;
  className?: string;
  inputClassName?: string;
  showClear?: boolean;
}

export function PredictiveSearchInput({
  scope,
  placeholder = "Search…",
  value,
  onQueryChange,
  onSelect,
  className,
  inputClassName,
  showClear = true,
}: PredictiveSearchInputProps) {
  const router = useRouter();
  const [input, setInput] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SuggestResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(input, 300);
  const onQueryChangeRef = useRef(onQueryChange);
  const prevValueRef = useRef(value);

  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  }, [onQueryChange]);

  // Sync external value changes only (not while user is typing ahead of debounce)
  useEffect(() => {
    if (value === undefined) return;
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setInput(value);
    }
  }, [value]);

  useEffect(() => {
    if (value !== undefined && debounced === value) return;
    onQueryChangeRef.current(debounced);
  }, [debounced, value]);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${SCOPE_ENDPOINT[scope]}?q=${encodeURIComponent(debounced.trim())}&limit=8`
        );
        const data = await res.json();
        if (cancelled) return;
        const mapped: SuggestResult[] = (data.results ?? []).map(
          (r: Record<string, string>) => ({
            id: r.id,
            questionId: r.questionId,
            address: r.address,
            title: r.title ?? r.name ?? "Result",
            subtitle: r.symbol ?? r.category,
            href: r.href,
          })
        );
        setResults(mapped);
        setOpen(mapped.length > 0);
        setActiveIndex(-1);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced, scope]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectResult = useCallback(
    (result: SuggestResult) => {
      setInput(result.title);
      setOpen(false);
      onSelect?.(result);
      router.push(result.href);
    },
    [onSelect, router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectResult(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn("pl-10 pr-20", inputClassName)}
        autoComplete="off"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {showClear && input && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => {
              setInput("");
              setResults([]);
              setOpen(false);
              onQueryChange("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-64 overflow-auto"
          role="listbox"
        >
          {results.map((result, idx) => (
            <li key={result.href + idx}>
              <button
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                  idx === activeIndex && "bg-accent"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectResult(result);
                }}
              >
                <div className="font-medium truncate">{result.title}</div>
                {result.subtitle && (
                  <div className="text-xs text-muted-foreground truncate">
                    {result.subtitle}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
