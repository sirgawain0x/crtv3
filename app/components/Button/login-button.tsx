'use client';

import { useActiveAccount } from 'thirdweb/react';
import { generatePayload, login } from '@app/api/auth/thirdweb/authentication';
import { signLoginPayload } from 'thirdweb/auth';
import { base } from 'thirdweb/chains';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@app/hooks/useAuth';
import { useRouter } from 'next/navigation';

export function LoginButton() {
  const account = useActiveAccount();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!account) {
      return alert('Please connect your wallet first');
    }

    try {
      setIsLoading(true);
      // Step 1: Generate the payload
      const payload = await generatePayload({
        address: account.address,
        chainId: base.id,
      });
      // Step 2: Sign the payload
      const signatureResult = await signLoginPayload({ account, payload });
      // Step 3: Call the login function we defined in the auth actions file
      await login(signatureResult);
      // Step 4: Force a router refresh to update the UI
      router.refresh();
    } catch (error) {
      console.error('Login failed:', error);
      alert('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button disabled={!account || isLoading} onClick={handleClick}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Logging in...
        </>
      ) : (
        'Login'
      )}
    </Button>
  );
}
