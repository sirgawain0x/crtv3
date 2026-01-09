"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

interface Token {
  symbol: string;
  name: string;
  logo: string;
}

const TOKENS: Token[] = [
  { symbol: "ETH", name: "Ethereum", logo: "/images/tokens/eth-logo.svg" },
  { symbol: "USDC", name: "USD Coin", logo: "/images/tokens/usdc-logo.svg" },
  { symbol: "DAI", name: "Dai", logo: "/images/tokens/dai-logo.svg" },
];

interface TokenSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function TokenSelect({ 
  value = "ETH", 
  onChange,
  className = "" 
}: TokenSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(
    TOKENS.find(t => t.symbol === value) || TOKENS[0]
  );

  // Sync internal state when value prop changes
  useEffect(() => {
    const token = TOKENS.find(t => t.symbol === value);
    if (token) {
      setSelectedToken(token);
    }
  }, [value]);

  const handleSelect = (token: Token) => {
    setSelectedToken(token);
    setIsOpen(false);
    onChange?.(token.symbol);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Token Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 p-2 border rounded 
          dark:bg-gray-700 dark:border-gray-600 bg-white hover:bg-gray-50 
          dark:hover:bg-gray-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Image
            src={selectedToken.logo}
            alt={selectedToken.symbol}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full"
          />
          <span className="font-medium">{selectedToken.symbol}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown List */}
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 
            border dark:border-gray-600 rounded shadow-lg max-h-60 overflow-auto">
            {TOKENS.map((token) => (
              <button
                key={token.symbol}
                type="button"
                onClick={() => handleSelect(token)}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 
                  dark:hover:bg-gray-600 transition-colors text-left ${
                  token.symbol === selectedToken.symbol
                    ? "bg-gray-50 dark:bg-gray-600"
                    : ""
                }`}
              >
                <Image
                  src={token.logo}
                  alt={token.symbol}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex flex-col">
                  <span className="font-medium">{token.symbol}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {token.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
