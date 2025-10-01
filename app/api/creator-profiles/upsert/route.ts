import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/sdk/supabase/service';
import { createClient } from '@/lib/sdk/supabase/server';

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

    let data, error;

    // Try service role client first (bypasses RLS)
    if (supabaseService) {
      const result = await supabaseService
        .from('creator_profiles')
        .upsert({
          owner_address: owner_address.toLowerCase(),
          username,
          bio,
          avatar_url,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'owner_address'
        })
        .select();
      
      data = result.data;
      error = result.error;
    } else {
      // Fallback to regular client (may fail due to RLS)
      const supabase = await createClient();
      const result = await supabase
        .from('creator_profiles')
        .upsert({
          owner_address: owner_address.toLowerCase(),
          username,
          bio,
          avatar_url,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'owner_address'
        })
        .select();
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Supabase upsert error:', error);
      
      // Provide helpful error message for RLS issues
      if (error.message.includes('row-level security policy')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'RLS policy violation. Please configure SUPABASE_SERVICE_ROLE_KEY environment variable or update RLS policies. See SUPABASE_RLS_SOLUTION.md for details.' 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to upsert creator profile: ${error.message}` 
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No data returned from upsert operation' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: data[0] 
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