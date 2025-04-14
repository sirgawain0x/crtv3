'use client';

import { useState } from 'react';
import { parseEther } from 'viem';
import { Button, buttonVariants } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';
import { useToast } from '@app/hooks/use-toast';
import { useSmartAccount } from '@app/services/smart-account';

export function SmartAccountDemo() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [accountAddress, setAccountAddress] = useState<string>();

  const smartAccount = useSmartAccount({
    mode: 'default',
    alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!,
  });

  const handleGetAddress = async () => {
    try {
      setIsLoading(true);
      const address = await smartAccount.getAddress();
      setAccountAddress(address);
      toast({
        title: 'Success',
        description: `Smart Account Address: ${address}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get smart account address',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOperation = async () => {
    try {
      setIsLoading(true);
      const result = await smartAccount.sendOperation({
        target: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // Vitalik's address
        data: '0x',
        value: parseEther('0'),
      });

      toast({
        title: 'Success',
        description: `Operation sent! Hash: ${result.hash}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send operation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Smart Account Demo</CardTitle>
        <CardDescription>
          Test your Modular Account v2 implementation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button
            onClick={handleGetAddress}
            disabled={isLoading}
            className="w-full"
          >
            Get Smart Account Address
          </Button>
          {accountAddress && (
            <p className="break-all text-sm text-muted-foreground">
              Address: {accountAddress}
            </p>
          )}
        </div>

        <Button
          onClick={handleSendOperation}
          disabled={isLoading}
          className="w-full"
        >
          Send Test Operation
        </Button>
      </CardContent>
    </Card>
  );
}
