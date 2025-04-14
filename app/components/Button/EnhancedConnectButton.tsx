import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useAuthModal, useLogout } from '@account-kit/react';
import { useBalance } from 'wagmi';
import { Button } from '@app/components/ui/button';
import { useToast } from '@app/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Loader2, Wallet, LogOut, ChevronDown } from 'lucide-react';
import { formatEther } from 'viem';
import { base } from '@account-kit/infra';

interface EnhancedConnectButtonProps {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export function EnhancedConnectButton({
  className,
  style,
  label = 'Get Started',
}: EnhancedConnectButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const { logout } = useLogout();
  const { address, account } = useAccount({ type: 'ModularAccountV2' });
  const { data: balance, isLoading: isBalanceLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: base.id,
    query: {
      enabled: !!address,
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      await openAuthModal();
      router.refresh();
      toast({
        title: 'Connected Successfully',
        description: 'Your wallet is now connected',
      });
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: 'Connection Failed',
        description:
          error instanceof Error ? error.message : 'Failed to connect wallet',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      await logout();
      router.refresh();
      toast({
        title: 'Disconnected Successfully',
        description: 'Your wallet has been disconnected',
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: 'Disconnect Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to disconnect wallet',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!address) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isLoading}
        className={className}
        style={style}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </span>
        ) : (
          label
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          {`${address.slice(0, 6)}...${address.slice(-4)}`}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Wallet Details</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex flex-col items-start gap-1">
          <span className="text-xs text-muted-foreground">Address</span>
          <span className="text-sm font-medium">{address}</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex flex-col items-start gap-1">
          <span className="text-xs text-muted-foreground">Balance</span>
          <span className="text-sm font-medium">
            {isBalanceLoading
              ? 'Loading...'
              : balance
                ? `${formatEther(balance.value)} ${balance.symbol}`
                : '0 ETH'}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={handleDisconnect}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
