import { supabase } from './client';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
}

export interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string;
    contentLength: number;
    httpStatusCode: number;
  };
}

export class SupabaseStorageService {
  private bucketName = 'creator-avatars';

  // Initialize storage bucket (run this once)
  async initializeBucket(): Promise<void> {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        throw new Error(`Failed to list buckets: ${listError.message}`);
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      if (!bucketExists) {
        // Create bucket
        const { data, error } = await supabase.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
        });

        if (error) {
          throw new Error(`Failed to create bucket: ${error.message}`);
        }

        console.log(`✅ Created storage bucket: ${this.bucketName}`);
      } else {
        console.log(`✅ Storage bucket already exists: ${this.bucketName}`);
      }
    } catch (error) {
      console.error('❌ Failed to initialize storage bucket:', error);
      throw error;
    }
  }

  // Upload avatar image
  async uploadAvatar(
    file: File, 
    ownerAddress: string, 
    options: {
      upsert?: boolean;
      cacheControl?: string;
    } = {}
  ): Promise<UploadResult> {
    try {
      // Validate file
      if (!this.isValidImageFile(file)) {
        return {
          success: false,
          error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.',
        };
      }

      // Generate file path
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `${ownerAddress.toLowerCase()}.${fileExtension}`;
      const filePath = `avatars/${fileName}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          upsert: options.upsert ?? true,
          cacheControl: options.cacheControl ?? '3600',
        });

      if (error) {
        return {
          success: false,
          error: `Upload failed: ${error.message}`,
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Delete avatar
  async deleteAvatar(ownerAddress: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to find and delete the avatar file
      const { data: files, error: listError } = await supabase.storage
        .from(this.bucketName)
        .list('avatars', {
          search: ownerAddress.toLowerCase(),
        });

      if (listError) {
        return {
          success: false,
          error: `Failed to list files: ${listError.message}`,
        };
      }

      if (files && files.length > 0) {
        const filePaths = files.map(file => `avatars/${file.name}`);
        
        const { error: deleteError } = await supabase.storage
          .from(this.bucketName)
          .remove(filePaths);

        if (deleteError) {
          return {
            success: false,
            error: `Failed to delete files: ${deleteError.message}`,
          };
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  // Get avatar URL
  getAvatarUrl(ownerAddress: string, fileName?: string): string {
    const filePath = fileName 
      ? `avatars/${fileName}`
      : `avatars/${ownerAddress.toLowerCase()}.jpg`; // Default to jpg

    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  // List user's avatar files
  async listUserAvatars(ownerAddress: string): Promise<StorageFile[]> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list('avatars', {
          search: ownerAddress.toLowerCase(),
        });

      if (error) {
        throw new Error(`Failed to list avatars: ${error.message}`);
      }

      return (data as unknown as StorageFile[]) || [];
    } catch (error) {
      console.error('Error listing user avatars:', error);
      return [];
    }
  }

  // Validate image file
  private isValidImageFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      return false;
    }

    if (file.size > maxSize) {
      return false;
    }

    return true;
  }

  // Get storage usage info
  async getStorageInfo(): Promise<{
    totalFiles: number;
    totalSize: number;
    bucketName: string;
  }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list('avatars');

      if (error) {
        throw new Error(`Failed to get storage info: ${error.message}`);
      }

      const totalFiles = data?.length || 0;
      const totalSize = data?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;

      return {
        totalFiles,
        totalSize,
        bucketName: this.bucketName,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        bucketName: this.bucketName,
      };
    }
  }
}

// Export a default instance
export const supabaseStorageService = new SupabaseStorageService();

