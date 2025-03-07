import { db } from './client';
import { OrbisAuth } from '@app/api/auth/orbisdb/auth';

export class OrbisService {
  private static readonly VIDEO_MODEL = 'videos';
  private static readonly USER_MODEL = 'users';

  static async insertVideo(
    data: VideoFormData,
  ): Promise<OrbisResponse<VideoData>> {
    try {
      // Ensure user is connected
      const user = await OrbisAuth.getCurrentUser();
      if (!user) throw new Error('User not connected');

      const result = await db
        .insert(this.VIDEO_MODEL)
        .value({
          ...data,
          // These fields are required but will be generated/provided by the system
          stream_id: crypto.randomUUID(), // or however you generate stream_id
          controller: user?.auth?.session?.did, // Use the authenticated user's DID
        })
        .run();

      return {
        success: true,
        data: result as unknown as VideoData,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to insert video',
      };
    }
  }

  static async insertUser(
    data: UserFormData,
  ): Promise<OrbisResponse<UserData>> {
    try {
      const result = await db
        .insert(this.USER_MODEL)
        .value({
          ...data,
          stream_id: crypto.randomUUID(),
          controller: data.address, // In this case, controller is the user's address
        })
        .run();

      return {
        success: true,
        data: result as unknown as UserData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to insert user',
      };
    }
  }

  private static async getCurrentUserAddress(): Promise<string> {
    // Implement getting the current user's wallet address
    // This could come from your authentication context
    throw new Error('Not implemented');
  }
}
