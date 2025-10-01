import { NextRequest, NextResponse } from 'next/server';
import { creatorProfileSupabaseService } from '@/lib/sdk/supabase/creator-profiles';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (owner) {
      // Get specific creator profile by owner address
      const profile = await creatorProfileSupabaseService.getCreatorProfileByOwner(owner);
      return NextResponse.json({ 
        success: true, 
        data: profile 
      });
    } else if (search) {
      // Search creator profiles
      const profiles = await creatorProfileSupabaseService.searchCreatorProfiles(search, limit);
      return NextResponse.json({ 
        success: true, 
        data: profiles 
      });
    } else {
      // Get all creator profiles with pagination
      const profiles = await creatorProfileSupabaseService.getAllCreatorProfiles({
        limit,
        offset,
      });
      return NextResponse.json({ 
        success: true, 
        data: profiles 
      });
    }
  } catch (error) {
    console.error('Error fetching creator profiles:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch creator profiles' 
      },
      { status: 500 }
    );
  }
}

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

    const profile = await creatorProfileSupabaseService.createCreatorProfile({
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
    console.error('Error creating creator profile:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create creator profile' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_address, username, bio, avatar_url } = body;

    if (!owner_address) {
      return NextResponse.json(
        { success: false, error: 'owner_address is required' },
        { status: 400 }
      );
    }

    const profile = await creatorProfileSupabaseService.updateCreatorProfile(owner_address, {
      username,
      bio,
      avatar_url,
    });

    return NextResponse.json({ 
      success: true, 
      data: profile 
    });
  } catch (error) {
    console.error('Error updating creator profile:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update creator profile' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');

    if (!owner) {
      return NextResponse.json(
        { success: false, error: 'owner parameter is required' },
        { status: 400 }
      );
    }

    await creatorProfileSupabaseService.deleteCreatorProfile(owner);

    return NextResponse.json({ 
      success: true, 
      message: 'Creator profile deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting creator profile:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete creator profile' 
      },
      { status: 500 }
    );
  }
}

