import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to fix creator profile addresses
 * Updates profile from controller address to Smart Account address
 * 
 * POST /api/creator-profiles/fix-address
 * Body: { controllerAddress: string, smartAccountAddress: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { controllerAddress, smartAccountAddress } = body;

    if (!controllerAddress || !smartAccountAddress) {
      return NextResponse.json(
        { error: 'Both controllerAddress and smartAccountAddress are required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Fixing profile address: ${controllerAddress} -> ${smartAccountAddress}`);

    // Create server-side Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Get the existing profile with controller address (case-insensitive)
    const { data: existingProfiles, error: fetchError } = await supabase
      .from('creator_profiles')
      .select('*')
      .ilike('owner_address', controllerAddress);

    if (fetchError) {
      throw fetchError;
    }

    if (!existingProfiles || existingProfiles.length === 0) {
      return NextResponse.json(
        { error: `No profile found for controller address: ${controllerAddress}` },
        { status: 404 }
      );
    }

    const existingProfile = existingProfiles[0];

    console.log(`✅ Found profile: ${existingProfile.username || 'No username'}`);

    // Check if a profile already exists with the smart account address
    const { data: smartAccountProfile } = await supabase
      .from('creator_profiles')
      .select('*')
      .ilike('owner_address', smartAccountAddress)
      .single();

    if (smartAccountProfile) {
      console.log(`⚠️  Profile already exists for smart account address`);
      
      // Delete the old controller address profile
      const { error: deleteError } = await supabase
        .from('creator_profiles')
        .delete()
        .ilike('owner_address', controllerAddress);

      if (deleteError) {
        throw deleteError;
      }
      
      return NextResponse.json({
        success: true,
        message: 'Profile already exists for smart account. Deleted old controller profile.',
        profile: smartAccountProfile,
      });
    }

    // Update the profile to use smart account address using the profile ID
    const { data: updatedProfiles, error: updateError } = await supabase
      .from('creator_profiles')
      .update({ 
        owner_address: smartAccountAddress.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingProfile.id)
      .select();

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    if (!updatedProfiles || updatedProfiles.length === 0) {
      throw new Error(`Failed to update profile - no rows affected. Profile ID: ${existingProfile.id}`);
    }

    const updatedProfile = updatedProfiles[0];

    console.log(`✅ Updated profile successfully`);
    console.log(`📊 New address: ${updatedProfile.owner_address}`);

    return NextResponse.json({
      success: true,
      message: 'Profile address updated successfully',
      profile: updatedProfile,
      oldAddress: controllerAddress,
      newAddress: smartAccountAddress,
    });

  } catch (error) {
    console.error('Error fixing profile address:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to fix profile address' },
      { status: 500 }
    );
  }
}
