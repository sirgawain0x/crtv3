import { NextRequest, NextResponse } from 'next/server';
import { creatorProfileSupabaseService } from '@/lib/sdk/supabase/creator-profiles';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_address, username, bio, avatar_url } = body;

    if (!owner_address) {
      return NextResponse.json(
        { success: false, error: 'owner_address is required' },
        { status: 400 }
      );
    }

    const profile = await creatorProfileSupabaseService.upsertCreatorProfile({
      owner_address,
      username,
      bio,
      avatar_url,
    });

    return NextResponse.json({ 
      success: true, 
      data: profile 
    });
  } catch (error) {
    console.error('Error upserting creator profile:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upsert creator profile' 
      },
      { status: 500 }
    );
  }
}

