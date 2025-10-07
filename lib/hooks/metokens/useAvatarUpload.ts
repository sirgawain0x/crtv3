"use client";

import { useState, useCallback } from 'react';
import { useUser } from '@account-kit/react';
import { ipfsService, IPFSUploadResult } from '@/lib/sdk/ipfs/service';
import { useCreatorProfile } from './useCreatorProfile';
import { useToast } from '@/components/ui/use-toast';

export interface UseAvatarUploadResult {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  uploadAvatar: (file: File) => Promise<IPFSUploadResult>;
  deleteAvatar: () => Promise<{ success: boolean; error?: string }>;
  getAvatarUrl: (ownerAddress: string) => string;
}

export function useAvatarUpload(targetAddress?: string): UseAvatarUploadResult {
  const user = useUser();
  const { toast } = useToast();
  const { updateProfile, upsertProfile } = useCreatorProfile(targetAddress);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const address = targetAddress || user?.address;

  const uploadAvatar = useCallback(async (file: File): Promise<IPFSUploadResult> => {
    if (!address) {
      const errorMsg = 'No address available for upload';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress (Lighthouse doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Upload to IPFS via Lighthouse
      const result = await ipfsService.uploadFile(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.url) {
        // Update creator profile with new avatar URL
        // Use upsertProfile to handle cases where profile doesn't exist yet
        await upsertProfile({ 
          owner_address: address,
          avatar_url: result.url 
        });
        
        toast({
          title: "Avatar Updated",
          description: "Your profile avatar has been updated successfully",
        });
      } else {
        setError(result.error || 'Upload failed');
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: result.error || 'Failed to upload avatar',
        });
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: errorMsg,
      });
      return { success: false, error: errorMsg };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [address, toast, upsertProfile]);

  const deleteAvatar = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!address) {
      const errorMsg = 'No address available for deletion';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsUploading(true);
    setError(null);

    try {
      // For IPFS, we can't actually delete the content, but we can remove the reference
      // Update creator profile to remove avatar URL
      await upsertProfile({ 
        owner_address: address,
        avatar_url: '' 
      });
      
      toast({
        title: "Avatar Removed",
        description: "Your profile avatar has been removed successfully",
      });

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMsg);
      toast({
        variant: "destructive",
        title: "Delete Error",
        description: errorMsg,
      });
      return { success: false, error: errorMsg };
    } finally {
      setIsUploading(false);
    }
  }, [address, toast, upsertProfile]);

  const getAvatarUrl = useCallback((ownerAddress: string): string => {
    // This method is no longer needed since we store the full IPFS URL in the database
    // But keeping it for backward compatibility
    return '';
  }, []);

  return {
    isUploading,
    uploadProgress,
    error,
    uploadAvatar,
    deleteAvatar,
    getAvatarUrl,
  };
}

