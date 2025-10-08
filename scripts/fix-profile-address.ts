/**
 * Script to fix creator profile addresses
 * Updates profiles from controller addresses to Smart Account addresses
 * 
 * Usage: npx tsx scripts/fix-profile-address.ts
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mapping of controller addresses to Smart Account addresses
const addressMappings: Record<string, string> = {
  // Add your mapping here: controller address -> smart account address
  '0x98c08b106c7e4fa5c8a655a3f75f3b3f553e760e': '0x2953B96F9160955f6256c9D444F8F7950E6647Df',
};

async function fixProfileAddresses() {
  console.log('🔄 Starting profile address fix...\n');

  for (const [controllerAddress, smartAccountAddress] of Object.entries(addressMappings)) {
    console.log(`\n📝 Processing: ${controllerAddress} -> ${smartAccountAddress}`);

    try {
      // Check if profile exists with controller address
      const { data: existingProfile, error: fetchError } = await supabase
        .from('creator_profiles')
        .select('*')
        .ilike('owner_address', controllerAddress)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          console.log(`   ⚠️  No profile found for ${controllerAddress}`);
          continue;
        }
        throw fetchError;
      }

      if (!existingProfile) {
        console.log(`   ⚠️  No profile found for ${controllerAddress}`);
        continue;
      }

      console.log(`   ✅ Found profile: ${existingProfile.username || 'No username'}`);

      // Check if a profile already exists with the smart account address
      const { data: smartAccountProfile, error: smartAccountError } = await supabase
        .from('creator_profiles')
        .select('*')
        .ilike('owner_address', smartAccountAddress)
        .single();

      if (smartAccountProfile) {
        console.log(`   ⚠️  Profile already exists for smart account address`);
        console.log(`   🔄 Deleting old controller address profile...`);
        
        // Delete the old profile
        const { error: deleteError } = await supabase
          .from('creator_profiles')
          .delete()
          .ilike('owner_address', controllerAddress);

        if (deleteError) {
          throw deleteError;
        }
        
        console.log(`   ✅ Deleted old profile`);
        continue;
      }

      // Update the profile to use smart account address
      const { data: updatedProfile, error: updateError } = await supabase
        .from('creator_profiles')
        .update({ 
          owner_address: smartAccountAddress.toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .ilike('owner_address', controllerAddress)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log(`   ✅ Updated profile successfully`);
      console.log(`   📊 New address: ${updatedProfile.owner_address}`);
      console.log(`   👤 Username: ${updatedProfile.username || 'No username'}`);
      console.log(`   📝 Bio: ${updatedProfile.bio || 'No bio'}`);
      console.log(`   🖼️  Avatar: ${updatedProfile.avatar_url ? 'Yes' : 'No'}`);

    } catch (error) {
      console.error(`   ❌ Error processing ${controllerAddress}:`, error);
    }
  }

  console.log('\n✅ Profile address fix complete!\n');
}

// Run the fix
fixProfileAddresses()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
