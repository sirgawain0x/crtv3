#!/usr/bin/env tsx
/**
 * Test Supabase PostgreSQL connection
 * This script tests the connection using the Session Pooler connection string
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

// Get connection details from environment or prompt
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Session Pooler connection details
const DB_HOST = 'aws-1-us-east-2.pooler.supabase.com';
const DB_PORT = 5432;
const DB_NAME = 'postgres';
const DB_USER = 'postgres.zdeiezfoemibjgrkyzvs';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || '';

async function testSupabaseClient() {
  console.log('🧪 Testing Supabase Client Connection...\n');
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅' : '❌');
    return false;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Test connection by querying a simple table
    const { data, error } = await supabase
      .from('metoken_subscribes')
      .select('count')
      .limit(1);
    
    if (error) {
      // PGRST116 = no rows found, which is OK
      if (error.code === 'PGRST116') {
        console.log('✅ Supabase client connection successful (table exists but empty)');
        return true;
      }
      throw error;
    }
    
    console.log('✅ Supabase client connection successful');
    return true;
  } catch (error: any) {
    console.error('❌ Supabase client connection failed:', error.message);
    return false;
  }
}

async function testPostgreSQLDirect() {
  console.log('\n🧪 Testing PostgreSQL Direct Connection (Session Pooler)...\n');
  
  if (!DB_PASSWORD) {
    console.error('❌ Missing SUPABASE_DB_PASSWORD environment variable');
    console.error('   Set it with: export SUPABASE_DB_PASSWORD="your-password"');
    return false;
  }

  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false, // Supabase uses SSL
    },
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQL connection established');
    
    // Test query
    const result = await client.query('SELECT version()');
    console.log('✅ Database query successful');
    console.log('   PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'metoken%'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Found ${tablesResult.rows.length} MeToken-related tables:`);
    tablesResult.rows.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });
    
    await client.end();
    return true;
  } catch (error: any) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    if (error.code === '28P01') {
      console.error('   → Authentication failed. Check your password.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   → Connection refused. Check host/port and network access.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   → Host not found. Check the hostname.');
    }
    return false;
  }
}

async function main() {
  console.log('🔐 Supabase Connection Test\n');
  console.log('='.repeat(50));
  
  const clientTest = await testSupabaseClient();
  const pgTest = await testPostgreSQLDirect();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📋 Test Results:');
  console.log(`   Supabase Client: ${clientTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   PostgreSQL Direct: ${pgTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (pgTest) {
    console.log('\n✅ Connection details are correct!');
    console.log('   You can now update the Goldsky secret with these credentials.');
  } else {
    console.log('\n❌ Connection failed. Please check:');
    console.log('   1. Database password is correct');
    console.log('   2. IP allowlist allows your connection');
    console.log('   3. Host and port are correct');
  }
  
  process.exit(pgTest ? 0 : 1);
}

main().catch(console.error);
