"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMeTokensSupabase } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface MeTokenCreatorProps {
  onMeTokenCreated?: (meTokenAddress: string) => void;
}

export function MeTokenCreator({ onMeTokenCreated }: MeTokenCreatorProps) {
  const [name, setName] = useState('Creative MeToken');
  const [symbol, setSymbol] = useState('CRTVM');
  const [localError, setLocalError] = useState<string | null>(null);

  const { createMeToken, isPending, isConfirming, isConfirmed, transactionError } = useMeTokensSupabase();

  // Reset form after successful creation
  useEffect(() => {
    if (isConfirmed) {
      setName('');
      setSymbol('');
      setLocalError(null);
    }
  }, [isConfirmed]);

  const handleCreateMeToken = async () => {
    if (!name.trim() || !symbol.trim()) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (symbol.length > 10) {
      setLocalError('Symbol must be 10 characters or less');
      return;
    }

    setLocalError(null);

    try {
      await createMeToken(name.trim(), symbol.trim().toUpperCase());
      // Don't set success here - let the hook handle the state
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create MeToken');
    }
  };

  const isLoading = isPending || isConfirming;
  const hasError = localError || transactionError;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Create Your MeToken</span>
          {isConfirmed && <CheckCircle className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Create your personal token to build a community around your success. 
          Your MeToken will be tradeable and can appreciate in value based on demand.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {localError || (transactionError?.message ? `Transaction failed: ${transactionError.message}` : 'An error occurred')}
            </AlertDescription>
          </Alert>
        )}

        {isPending && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Creating MeToken... Please confirm the transaction in your wallet.
            </AlertDescription>
          </Alert>
        )}

        {isConfirming && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Transaction submitted! Waiting for confirmation...
            </AlertDescription>
          </Alert>
        )}

        {isConfirmed && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              MeToken created successfully! Your personal token is now live.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">MeToken Name</Label>
            <Input
              id="name"
              placeholder="e.g., John's MeToken"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              This will be the full name of your MeToken
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g., JOHN"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              disabled={isLoading}
              maxLength={10}
            />
            <p className="text-sm text-muted-foreground">
              Short symbol for your MeToken (max 10 characters)
            </p>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleCreateMeToken}
            disabled={isLoading || !name.trim() || !symbol.trim() || isConfirmed}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isPending ? 'Creating...' : isConfirming ? 'Confirming...' : 'Creating MeToken...'}
              </>
            ) : isConfirmed ? (
              'MeToken Created!'
            ) : (
              'Create MeToken'
            )}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>What happens when you create a MeToken:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Your personal token will be deployed on Base</li>
            <li>It will be tradeable through the MeTokens AMM</li>
            <li>Community members can buy and hold your token</li>
            <li>You can earn from trading fees and token appreciation</li>
            <li>Your token can be used for token-gated features</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
