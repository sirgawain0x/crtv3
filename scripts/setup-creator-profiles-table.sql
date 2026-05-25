-- Creator Profiles Table Setup Script
-- Run this in your Supabase SQL Editor to create the missing creator_profiles table

-- Creator Profiles table (replacing OrbisDB metadata)
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address TEXT UNIQUE NOT NULL, -- Creator's wallet address (primary key)
  username TEXT,
  bio TEXT,
  avatar_url TEXT, -- URL to avatar image stored on IPFS via Lighthouse
  orb_account_id TEXT, -- Orb sovereign account id from QR sign-in
  lens_account_id TEXT, -- Lens account address linked via Orb
  lens_handle TEXT, -- Lens username/handle for display
  lens_avatar_uri TEXT, -- Lens profile picture URI (ipfs/lens)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creator profiles indexes
CREATE INDEX IF NOT EXISTS idx_creator_profiles_owner ON creator_profiles(owner_address);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_username ON creator_profiles(username);
CREATE UNIQUE INDEX IF NOT EXISTS creator_profiles_orb_account_id_key
  ON creator_profiles (orb_account_id)
  WHERE orb_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS creator_profiles_lens_account_id_idx
  ON creator_profiles (lens_account_id)
  WHERE lens_account_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for creator_profiles table
CREATE POLICY "Anyone can view creator profiles" ON creator_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON creator_profiles
  FOR INSERT WITH CHECK (auth.jwt() ->> 'address' = owner_address);

CREATE POLICY "Users can update their own profile" ON creator_profiles
  FOR UPDATE USING (auth.jwt() ->> 'address' = owner_address);

CREATE POLICY "Users can delete their own profile" ON creator_profiles
  FOR DELETE USING (auth.jwt() ->> 'address' = owner_address);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_creator_profiles_updated_at 
  BEFORE UPDATE ON creator_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the table was created
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'creator_profiles' 
ORDER BY ordinal_position;
