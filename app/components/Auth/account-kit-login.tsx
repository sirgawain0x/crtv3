import { useState, type ChangeEvent } from 'react';
import { Button } from '@app/components/ui/button';
import { Input } from '@app/components/ui/input';
import { useAccountKit } from '@app/components/providers/account-kit-provider';
import { useToast } from '@app/components/ui/use-toast';

export function AccountKitLogin() {
  const { connect, disconnect, isConnected, address } = useAccountKit();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await connect(email);
      toast({
        title: 'Connected',
        description: 'Successfully connected to your account',
      });
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to connect to your account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setEmail('');
    toast({
      title: 'Disconnected',
      description: 'Successfully disconnected from your account',
    });
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {isConnected ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Connected: {address}</p>
          <Button onClick={handleDisconnect} variant="destructive">
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            disabled={isLoading}
          />
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect with Email'}
          </Button>
        </div>
      )}
    </div>
  );
}
