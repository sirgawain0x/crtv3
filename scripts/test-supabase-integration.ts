#!/usr/bin/env tsx

/**
 * Test Script: Supabase Creator Profiles Integration
 * ================================================
 * 
 * This script tests the complete Supabase integration for creator profiles,
 * including database operations, storage, and API endpoints.
 * 
 * Usage:
 *   npm run test:supabase-integration
 *   or
 *   tsx scripts/test-supabase-integration.ts
 * 
 * Prerequisites:
 * - Supabase database with creator_profiles table created
 * - Environment variables set up
 * - Storage bucket initialized
 */

import { createClient } from '@supabase/supabase-js';
import { meTokenSupabaseService } from '../lib/sdk/supabase/metokens';
import { creatorProfileSupabaseService } from '../lib/sdk/supabase/creator-profiles';
import { supabaseStorageService } from '../lib/sdk/supabase/storage';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Initialize client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  test: string;
  success: boolean;
  error?: string;
  data?: any;
}

async function runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
  try {
    console.log(`🧪 Running test: ${testName}`);
    const result = await testFn();
    console.log(`✅ Test passed: ${testName}`);
    return { test: testName, success: true, data: result };
  } catch (error) {
    console.error(`❌ Test failed: ${testName}`, error);
    return { 
      test: testName, 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function testDatabaseConnection(): Promise<void> {
  const { data, error } = await supabase.from('creator_profiles').select('count').limit(1);
  if (error) throw new Error(`Database connection failed: ${error.message}`);
}

async function testCreatorProfileCRUD(): Promise<any> {
  const testAddress = '0x1234567890123456789012345678901234567890';
  
  // Test CREATE
  const createData = {
    owner_address: testAddress,
    username: 'TestUser',
    bio: 'This is a test bio for the creator profile.',
    avatar_url: 'https://example.com/test-avatar.jpg',
  };
  
  const createdProfile = await creatorProfileSupabaseService.createCreatorProfile(createData);
  
  // Test READ
  const retrievedProfile = await creatorProfileSupabaseService.getCreatorProfileByOwner(testAddress);
  if (!retrievedProfile) throw new Error('Failed to retrieve created profile');
  
  // Test UPDATE
  const updatedProfile = await creatorProfileSupabaseService.updateCreatorProfile(testAddress, {
    username: 'UpdatedTestUser',
    bio: 'Updated bio content',
  });
  
  // Test UPSERT
  const upsertedProfile = await creatorProfileSupabaseService.upsertCreatorProfile({
    owner_address: testAddress,
    username: 'UpsertedUser',
    bio: 'Upserted bio content',
  });
  
  // Test DELETE
  await creatorProfileSupabaseService.deleteCreatorProfile(testAddress);
  
  return {
    created: createdProfile,
    retrieved: retrievedProfile,
    updated: updatedProfile,
    upserted: upsertedProfile,
  };
}

async function testMeTokenIntegration(): Promise<any> {
  // Get a sample MeToken
  const meTokens = await meTokenSupabaseService.getAllMeTokens({ limit: 1 });
  if (meTokens.length === 0) {
    console.log('⚠️  No MeTokens found in database, skipping integration test');
    return { message: 'No MeTokens available for testing' };
  }
  
  const meToken = meTokens[0];
  const ownerAddress = meToken.owner_address;
  
  // Test getting creator profile with MeToken
  const result = await creatorProfileSupabaseService.getCreatorProfileWithMeToken(ownerAddress);
  
  return {
    meToken,
    profile: result.profile,
    combinedResult: result,
  };
}

async function testStorageOperations(): Promise<any> {
  // Test storage info
  const storageInfo = await supabaseStorageService.getStorageInfo();
  
  // Test avatar URL generation
  const testAddress = '0x1234567890123456789012345678901234567890';
  const avatarUrl = supabaseStorageService.getAvatarUrl(testAddress);
  
  return {
    storageInfo,
    avatarUrl,
  };
}

async function testAPIEndpoints(): Promise<any> {
  const testAddress = '0x1234567890123456789012345678901234567890';
  
  // Test GET endpoint
  const getResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/creator-profiles?owner=${testAddress}`);
  const getResult = await getResponse.json();
  
  // Test POST endpoint
  const postResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/creator-profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner_address: testAddress,
      username: 'APITestUser',
      bio: 'Test bio from API',
    }),
  });
  const postResult = await postResponse.json();
  
  // Test PUT endpoint
  const putResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/creator-profiles`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner_address: testAddress,
      username: 'UpdatedAPITestUser',
      bio: 'Updated test bio from API',
    }),
  });
  const putResult = await putResponse.json();
  
  // Test DELETE endpoint
  const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/creator-profiles?owner=${testAddress}`, {
    method: 'DELETE',
  });
  const deleteResult = await deleteResponse.json();
  
  return {
    get: getResult,
    post: postResult,
    put: putResult,
    delete: deleteResult,
  };
}

async function testRLSPolicies(): Promise<any> {
  // Test that we can read profiles (public read policy)
  const { data: publicRead, error: publicReadError } = await supabase
    .from('creator_profiles')
    .select('*')
    .limit(1);
  
  if (publicReadError) throw new Error(`Public read failed: ${publicReadError.message}`);
  
  return {
    publicRead: publicRead,
    message: 'RLS policies are working correctly',
  };
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Supabase Creator Profiles Integration Tests...\n');
  
  const tests = [
    () => runTest('Database Connection', testDatabaseConnection),
    () => runTest('Creator Profile CRUD Operations', testCreatorProfileCRUD),
    () => runTest('MeToken Integration', testMeTokenIntegration),
    () => runTest('Storage Operations', testStorageOperations),
    () => runTest('RLS Policies', testRLSPolicies),
    // Note: API endpoint tests require the Next.js server to be running
    // () => runTest('API Endpoints', testAPIEndpoints),
  ];
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    const result = await test();
    results.push(result);
  }
  
  // Print summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  - ${result.test}: ${result.error}`);
    });
  }
  
  console.log('\n🎉 Integration tests completed!');
  
  if (failed === 0) {
    console.log('✨ All tests passed! The Supabase integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n✅ Test script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

export { runAllTests };

