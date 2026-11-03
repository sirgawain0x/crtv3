"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreatorProfile } from '@/lib/hooks/metokens/useCreatorProfile';
import { useUser } from '@/lib/wallet/react';
import { useToast } from '@/components/ui/use-toast';
import { useWalletStatus } from '@/lib/hooks/accountkit/useWalletStatus';
import { AvatarUpload } from './AvatarUpload';
import { DigitalTwinSection } from './DigitalTwinSection';
import { BrandChannelSection } from './BrandChannelSection';
import { Loader2, CheckCircle, AlertCircle, User, Save, Edit3 } from 'lucide-react';
import {
  normalizeCreatorSocialProfileUrl,
  type CreatorSocialPlatform,
} from '@/lib/creator/social-profile-urls';

interface CreatorProfileManagerProps {
  targetAddress?: string;
  onProfileUpdated?: () => void;
}

export function CreatorProfileManager({ targetAddress, onProfileUpdated }: CreatorProfileManagerProps) {
  const user = useUser();
  const { toast } = useToast();
  const { smartAccountAddress } = useWalletStatus();
  const { profile, loading, error, updateProfile, upsertProfile } = useCreatorProfile(targetAddress);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    avatar_url: '',
    social_orb_url: '',
    social_instagram_url: '',
    social_x_url: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const validateSocialField = (platform: CreatorSocialPlatform, value: string) => {
    const fieldKey =
      platform === 'orb'
        ? 'social_orb_url'
        : platform === 'instagram'
          ? 'social_instagram_url'
          : 'social_x_url';
    const result = normalizeCreatorSocialProfileUrl(platform, value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (result.ok) {
        delete next[fieldKey];
      } else {
        next[fieldKey] = result.error;
      }
      return next;
    });
    return result;
  };

  const validateAllSocialFields = () => {
    const orb = validateSocialField('orb', formData.social_orb_url);
    const instagram = validateSocialField('instagram', formData.social_instagram_url);
    const x = validateSocialField('x', formData.social_x_url);
    return orb.ok && instagram.ok && x.ok;
  };

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        social_orb_url: profile.social_orb_url || '',
        social_instagram_url: profile.social_instagram_url || '',
        social_x_url: profile.social_x_url || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user?.address) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please connect your wallet to update your profile",
      });
      return;
    }

    if (!validateAllSocialFields()) {
      toast({
        variant: "destructive",
        title: "Fix social links",
        description: "One or more social profile fields are invalid.",
      });
      return;
    }

    const orb = normalizeCreatorSocialProfileUrl('orb', formData.social_orb_url);
    const instagram = normalizeCreatorSocialProfileUrl(
      'instagram',
      formData.social_instagram_url,
    );
    const x = normalizeCreatorSocialProfileUrl('x', formData.social_x_url);
    const socialPayload = {
      social_orb_url: orb.ok ? orb.url : null,
      social_instagram_url: instagram.ok ? instagram.url : null,
      social_x_url: x.ok ? x.url : null,
    };

    setIsSaving(true);
    try {
      if (profile) {
        // Update existing profile
        await updateProfile({
          username: formData.username,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          ...socialPayload,
        });
        toast({
          title: "Profile Updated",
          description: "Your creator profile has been updated successfully",
        });
      } else {
        // Create new profile
        await upsertProfile({
          owner_address: user.address,
          username: formData.username,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          ...socialPayload,
        });
        toast({
          title: "Profile Created",
          description: "Your creator profile has been created successfully",
        });
      }
      setIsEditing(false);
      onProfileUpdated?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save profile",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        social_orb_url: profile.social_orb_url || '',
        social_instagram_url: profile.social_instagram_url || '',
        social_x_url: profile.social_x_url || '',
      });
      setFieldErrors({});
    }
    setIsEditing(false);
  };

  const renderSocialField = (
    id: keyof Pick<
      typeof formData,
      'social_orb_url' | 'social_instagram_url' | 'social_x_url'
    >,
    label: string,
    placeholder: string,
    platform: CreatorSocialPlatform,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {isEditing ? (
        <>
          <Input
            id={id}
            placeholder={placeholder}
            value={formData[id]}
            onChange={(e) => {
              const value = e.target.value;
              setFormData((prev) => ({ ...prev, [id]: value }));
              if (fieldErrors[id]) {
                validateSocialField(platform, value);
              }
            }}
            onBlur={(e) => validateSocialField(platform, e.target.value)}
            disabled={!isOwner}
            aria-invalid={Boolean(fieldErrors[id])}
            aria-describedby={fieldErrors[id] ? `${id}-error` : undefined}
          />
          {fieldErrors[id] ? (
            <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
              {fieldErrors[id]}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Handle or full profile URL. Leave blank to hide on your creator page.
            </p>
          )}
        </>
      ) : (
        <div className="p-2 border rounded-md bg-muted">
          {formData[id] ? (
            <span className="break-all">{formData[id]}</span>
          ) : (
            <span className="text-muted-foreground">Not set</span>
          )}
        </div>
      )}
    </div>
  );

  const isOwner = !targetAddress || targetAddress === user?.address || targetAddress === smartAccountAddress;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Creator Profile
        </CardTitle>
        <CardDescription>
          Manage your creator profile information that will be displayed with your MeToken
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isOwner && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You can only edit your own profile. This is a read-only view.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col md:flex-row items-start gap-4">
          <AvatarUpload
            targetAddress={targetAddress}
            size="md"
            showUploadButton={isOwner}
            overrideAvatarUrl={formData.avatar_url || undefined}
            onUploadComplete={(url) => {
              setFormData(prev => ({ ...prev, avatar_url: url }));
            }}
          />

          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              {isEditing ? (
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  disabled={!isOwner}
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted">
                  {formData.username || <span className="text-muted-foreground">No username set</span>}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={!isOwner}
                  rows={3}
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted min-h-[80px]">
                  {formData.bio || <span className="text-muted-foreground">No bio set</span>}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-2 border-t">
              <p className="text-sm font-medium">Social profiles</p>
              {renderSocialField(
                'social_orb_url',
                'Orb',
                '@handle or https://orb.club/p/handle',
                'orb',
              )}
              {renderSocialField(
                'social_instagram_url',
                'Instagram',
                '@handle or https://instagram.com/handle',
                'instagram',
              )}
              {renderSocialField(
                'social_x_url',
                'X',
                '@handle or https://x.com/handle',
                'x',
              )}
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="flex flex-col gap-2 pt-4 sm:flex-row">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        )}

        {profile && (
          <div className="text-sm text-muted-foreground pt-4 border-t">
            <p>Profile created: {new Date(profile.created_at).toLocaleDateString()}</p>
            {profile.updated_at !== profile.created_at && (
              <p>Last updated: {new Date(profile.updated_at).toLocaleDateString()}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    {(targetAddress || user?.address) && (
      <DigitalTwinSection
        ownerAddress={(targetAddress || user?.address) as string}
        initialProfile={profile ?? null}
        isOwner={isOwner}
        onSaved={onProfileUpdated}
      />
    )}
    {isOwner && (
      <BrandChannelSection
        targetAddress={targetAddress}
        onSaved={onProfileUpdated}
      />
    )}
    </div>
  );
}
