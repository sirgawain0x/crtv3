"use client";

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreatorProfileWithMeToken } from '@/lib/hooks/metokens/useCreatorProfile';
import { Loader2, User, TrendingUp, Wallet } from 'lucide-react';
import { convertFailingGateway } from '@/lib/utils/image-gateway';

interface CreatorProfileDisplayProps {
  ownerAddress: string;
  meTokenName?: string;
  meTokenSymbol?: string;
  showMeTokenInfo?: boolean;
}

export function CreatorProfileDisplay({ 
  ownerAddress, 
  meTokenName, 
  meTokenSymbol, 
  showMeTokenInfo = true 
}: CreatorProfileDisplayProps) {
  const { profile, meToken, loading, error } = useCreatorProfileWithMeToken(ownerAddress);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading creator profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Unable to load creator profile</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = profile?.username || `${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}`;
  const displayBio = profile?.bio || 'No bio available';
  const avatarUrl = profile?.avatar_url ? convertFailingGateway(profile.avatar_url) : undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>
              {profile?.username ? profile.username.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {displayName}
              {profile?.username && (
                <Badge variant="secondary" className="text-xs">
                  Verified Creator
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="h-3 w-3" />
                <span className="font-mono">{ownerAddress}</span>
              </div>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {displayBio}
          </p>
        </div>

        {showMeTokenInfo && (meToken || (meTokenName && meTokenSymbol)) && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4" />
              <h4 className="font-semibold">MeToken</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Token</p>
                <p className="font-semibold">
                  {meToken?.name || meTokenName} (${meToken?.symbol || meTokenSymbol})
                </p>
              </div>
              
              {meToken && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">TVL</p>
                    <p className="font-semibold text-green-600">
                      ${meToken.tvl?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Supply</p>
                    <p className="font-semibold">
                      {meToken.total_supply?.toFixed(2) || '0'} {meToken.symbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="font-semibold">
                      {meToken.created_at ? new Date(meToken.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {profile && (
          <div className="border-t pt-4 text-xs text-muted-foreground">
            <p>Profile created: {new Date(profile.created_at).toLocaleDateString()}</p>
            {profile.updated_at !== profile.created_at && (
              <p>Last updated: {new Date(profile.updated_at).toLocaleDateString()}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

