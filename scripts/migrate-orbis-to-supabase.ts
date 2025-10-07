#!/usr/bin/env tsx

/**
 * Migration Script: OrbisDB to Supabase Creator Profiles
 * ====================================================
 * 
 * This script migrates creator profile data from OrbisDB (Ceramic Network) to Supabase.
 * It fetches existing MeToken data from Supabase and attempts to retrieve corresponding
 * profile data from OrbisDB, then creates creator profiles in Supabase.
 * 
 * Usage:
 *   npm run migrate:orbis-to-supabase
 *   or
 *   tsx scripts/migrate-orbis-to-supabase.ts
 * 
 * Prerequisites:
 * - Supabase database with creator_profiles table created
 * - OrbisDB connection configured
 * - Environment variables set up
 */

import { createClient } from '@supabase/supabase-js';
import { Orbis } from '@orbisclub/orbis-sdk';
import { meTokenSupabaseService } from '../lib/sdk/supabase/metokens';
import { creatorProfileSupabaseService } from '../lib/sdk/supabase/creator-profiles';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ORBIS_NODE_URL = process.env.NEXT_PUBLIC_ORBIS_NODE_URL!;
const ORBIS_ENVIRONMENT_ID = process.env.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ORBIS_NODE_URL || !ORBIS_ENVIRONMENT_ID) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_ORBIS_NODE_URL, NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const orbis = new Orbis({
  node: ORBIS_NODE_URL,
  environment: ORBIS_ENVIRONMENT_ID,
});

interface OrbisProfile {
  did: string;
  address?: string;
  username?: string;
  email?: string;
  profileImage?: string;
  metadata?: Record<string, unknown>;
}

interface MigrationStats {
  totalMeTokens: number;
  profilesFound: number;
  profilesCreated: number;
  profilesSkipped: number;
  errors: number;
}

async function fetchOrbisProfile(address: string): Promise<OrbisProfile | null> {
  try {
    console.log(`🔍 Fetching OrbisDB profile for ${address}...`);
    
    // Try to get profile data from OrbisDB
    // Note: This is a simplified approach - you may need to adjust based on your OrbisDB setup
    const { data, error } = await orbis.getProfile(address);
    
    if (error) {
      console.warn(`⚠️  Failed to fetch OrbisDB profile for ${address}:`, error);
      return null;
    }
    
    if (data && data.profile) {
      console.log(`✅ Found OrbisDB profile for ${address}`);
      return data.profile as OrbisProfile;
    }
    
    return null;
  } catch (error) {
    console.warn(`⚠️  Error fetching OrbisDB profile for ${address}:`, error);
    return null;
  }
}

async function migrateCreatorProfiles(): Promise<void> {
  console.log('🚀 Starting OrbisDB to Supabase migration...\n');
  
  const stats: MigrationStats = {
    totalMeTokens: 0,
    profilesFound: 0,
    profilesCreated: 0,
    profilesSkipped: 0,
    errors: 0,
  };

  try {
    // Get all MeTokens from Supabase
    console.log('📊 Fetching MeTokens from Supabase...');
    const meTokens = await meTokenSupabaseService.getAllMeTokens({ limit: 1000 });
    stats.totalMeTokens = meTokens.length;
    
    console.log(`✅ Found ${meTokens.length} MeTokens in Supabase\n`);

    // Process each MeToken
    for (const meToken of meTokens) {
      const ownerAddress = meToken.owner_address;
      console.log(`\n🔄 Processing MeToken: ${meToken.name} (${meToken.symbol})`);
      console.log(`   Owner: ${ownerAddress}`);
      console.log(`   Address: ${meToken.address}`);

      try {
        // Check if creator profile already exists
        const existingProfile = await creatorProfileSupabaseService.getCreatorProfileByOwner(ownerAddress);
        
        if (existingProfile) {
          console.log(`⏭️  Creator profile already exists for ${ownerAddress}, skipping...`);
          stats.profilesSkipped++;
          continue;
        }

        // Try to fetch profile from OrbisDB
        const orbisProfile = await fetchOrbisProfile(ownerAddress);
        
        if (orbisProfile) {
          stats.profilesFound++;
          
          // Create creator profile in Supabase
          const profileData = {
            owner_address: ownerAddress,
            username: orbisProfile.username || undefined,
            bio: orbisProfile.metadata?.bio as string || undefined,
            avatar_url: orbisProfile.profileImage || undefined,
          };

          // Filter out undefined values
          const cleanProfileData = Object.fromEntries(
            Object.entries(profileData).filter(([_, value]) => value !== undefined)
          );

          await creatorProfileSupabaseService.createCreatorProfile(cleanProfileData);
          console.log(`✅ Created creator profile for ${ownerAddress}`);
          stats.profilesCreated++;
        } else {
          console.log(`⚠️  No OrbisDB profile found for ${ownerAddress}, creating minimal profile...`);
          
          // Create a minimal profile with just the owner address
          await creatorProfileSupabaseService.createCreatorProfile({
            owner_address: ownerAddress,
          });
          console.log(`✅ Created minimal creator profile for ${ownerAddress}`);
          stats.profilesCreated++;
        }
      } catch (error) {
        console.error(`❌ Error processing MeToken ${meToken.address}:`, error);
        stats.errors++;
      }
    }

    // Print migration summary
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    console.log(`Total MeTokens processed: ${stats.totalMeTokens}`);
    console.log(`OrbisDB profiles found: ${stats.profilesFound}`);
    console.log(`Creator profiles created: ${stats.profilesCreated}`);
    console.log(`Profiles skipped (already exist): ${stats.profilesSkipped}`);
    console.log(`Errors: ${stats.errors}`);
    
    if (stats.errors === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with ${stats.errors} errors.`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateCreatorProfiles()
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateCreatorProfiles };

