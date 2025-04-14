import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@app/components/ui/button';
import { Card, CardContent } from '@app/components/ui/card';
import { Separator } from '@app/components/ui/separator';
import { Badge } from '@app/components/ui/badge';
import { cn } from '@app/lib/utils';
import { useAccount, useBalance, useDisconnect, useEnsName } from 'wagmi';
import { useEffect, useRef } from 'react';

interface WalletConnectDetailsProps {
  className?: string;
}

export function WalletConnectDetails({ className }: WalletConnectDetailsProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';
  const displayBalance = balance
    ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
    : '0.0000 ETH';
  const network = 'Base';
  const accountType = 'Smart Contract Account';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!address) return null;

  return (
    <div className="relative" ref={wrapperRef}>
      <Button
        variant="ghost"
        className="flex items-center gap-2 px-3 py-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Badge variant="outline" className="font-mono text-xs">
          {displayAddress}
        </Badge>
      </Button>
      {isOpen && (
        <Card
          className={cn(
            'absolute right-0 top-full z-50 mt-2 w-[320px] border-0 shadow-lg',
            'transform-gpu transition-all duration-200 ease-out',
            className,
          )}
        >
          <CardContent className="p-0">
            <div className="flex justify-end p-2">
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  disconnect();
                }}
                className="bg-pink-500 text-white hover:bg-pink-600"
              >
                Disconnect
              </Button>
            </div>

            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-muted-foreground">Balance</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{displayBalance}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-4 p-4">
              <div>
                <div className="mb-1 text-sm text-muted-foreground">
                  Full Address
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted p-2">
                  <span className="mr-2 truncate font-mono text-xs">
                    {ensName || address}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4" />
                    {copied && (
                      <span className="absolute -top-8 right-0 rounded bg-black px-2 py-1 text-xs text-white">
                        Copied!
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <div className="mb-1 text-sm text-muted-foreground">
                  Network
                </div>
                <div className="font-medium">{network}</div>
              </div>

              <div>
                <div className="mb-1 text-sm text-muted-foreground">
                  Account Type
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>{accountType}</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="mt-4 flex w-full items-center justify-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    `https://basescan.org/address/${address}`,
                    '_blank',
                  );
                }}
              >
                View on Explorer
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
