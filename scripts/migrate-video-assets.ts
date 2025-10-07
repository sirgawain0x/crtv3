#!/usr/bin/env tsx
/**
 * Migration script to move video assets from NeonDB to Supabase
 * Run with: yarn tsx scripts/migrate-video-assets.ts
 */

import { neon } from "@neondatabase/serverless";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const neonUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!neonUrl || !supabaseUrl || !supabaseKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const neonSql = neon(neonUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateVideoAssets() {
  try {
    console.log("🔄 Starting video assets migration...");

    // Fetch all video assets from NeonDB
    const videoAssets = await neonSql`
      SELECT * FROM video_assets ORDER BY id
    `;

    console.log(`📊 Found ${videoAssets.length} video assets to migrate`);

    if (videoAssets.length === 0) {
      console.log("✅ No video assets to migrate");
      return;
    }

    // Migrate each video asset
    let successCount = 0;
    let errorCount = 0;

    for (const asset of videoAssets) {
      try {
        const { data, error } = await supabase
          .from('video_assets')
          .insert({
            title: asset.title,
            asset_id: asset.asset_id,
            category: asset.category,
            location: asset.location,
            playback_id: asset.playback_id,
            description: asset.description,
            creator_id: asset.creator_id,
            status: asset.status,
            thumbnail_url: asset.thumbnail_url || asset.thumbnailUri || '',
            duration: asset.duration,
            views_count: asset.views_count || 0,
            likes_count: asset.likes_count || 0,
            is_minted: asset.is_minted || false,
            token_id: asset.token_id,
            contract_address: asset.contract_address,
            minted_at: asset.minted_at,
            mint_transaction_hash: asset.mint_transaction_hash,
            royalty_percentage: asset.royalty_percentage,
            price: asset.price,
            max_supply: asset.max_supply,
            current_supply: asset.current_supply || 0,
            metadata_uri: asset.metadata_uri,
            attributes: asset.attributes,
            created_at: asset.created_at,
            updated_at: asset.updated_at || new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Failed to migrate asset ${asset.asset_id}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Migrated asset: ${asset.title} (${asset.asset_id})`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error migrating asset ${asset.asset_id}:`, err);
        errorCount++;
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully migrated: ${successCount} assets`);
    console.log(`❌ Failed to migrate: ${errorCount} assets`);

  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateVideoAssets().then(() => {
  console.log("🏁 Migration script finished");
  process.exit(0);
});
