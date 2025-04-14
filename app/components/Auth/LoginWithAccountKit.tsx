'use client';

import { useState } from 'react';
import { useAccountKitAuth } from '@app/hooks/useAccountKit';
import { Button } from '@app/components/ui/button';
import { Input } from '@app/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';
import { Loader, Database } from 'lucide-react';

export function LoginWithAccountKit() {
  const { connectWithEmail, connectWithGoogle, isLoading, error } =
    useAccountKitAuth();
  const [email, setEmail] = useState('');

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    await connectWithEmail(email);
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Login with Account Kit</CardTitle>
        <CardDescription>Choose your preferred way to connect</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Continue with Email'
            )}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => connectWithGoogle()}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Google
            </>
          )}
        </Button>
      </CardContent>
      {error && (
        <CardFooter>
          <p className="text-sm text-red-500">{error.message}</p>
        </CardFooter>
      )}
    </Card>
  );
}
