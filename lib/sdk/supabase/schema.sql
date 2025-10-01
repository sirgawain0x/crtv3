-- MeTokens Supabase Database Schema
-- Run this in your Supabase SQL editor to set up the tables

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- MeTokens table
CREATE TABLE IF NOT EXISTS metokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT UNIQUE NOT NULL, -- Contract address
  owner_address TEXT NOT NULL, -- Creator's wallet address
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  total_supply NUMERIC NOT NULL DEFAULT 0,
  tvl NUMERIC NOT NULL DEFAULT 0,
  hub_id INTEGER NOT NULL DEFAULT 1,
  balance_pooled NUMERIC NOT NULL DEFAULT 0,
  balance_locked NUMERIC NOT NULL DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  end_cooldown TIMESTAMP WITH TIME ZONE,
  target_hub_id INTEGER,
  migration_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MeToken balances for users
CREATE TABLE IF NOT EXISTS metoken_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metoken_id UUID REFERENCES metokens(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(metoken_id, user_address)
);

-- MeToken transactions/history
CREATE TABLE IF NOT EXISTS metoken_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metoken_id UUID REFERENCES metokens(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('mint', 'burn', 'transfer', 'create')),
  amount NUMERIC NOT NULL DEFAULT 0,
  collateral_amount NUMERIC, -- For mint/burn transactions
  transaction_hash TEXT,
  block_number BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creator Profiles table (replacing OrbisDB metadata)
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address TEXT UNIQUE NOT NULL, -- Creator's wallet address (primary key)
  username TEXT,
  bio TEXT,
  avatar_url TEXT, -- URL to avatar image in Supabase Storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video Assets table
CREATE TABLE IF NOT EXISTS video_assets (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  asset_id TEXT UNIQUE NOT NULL, -- Livepeer asset ID (UUID)
  category TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  playback_id TEXT NOT NULL,
  description TEXT,
  creator_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'minted', 'archived')),
  thumbnail_url TEXT NOT NULL DEFAULT '',
  duration INTEGER, -- Duration in seconds
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  is_minted BOOLEAN NOT NULL DEFAULT FALSE,
  token_id TEXT,
  contract_address TEXT,
  minted_at TIMESTAMP WITH TIME ZONE,
  mint_transaction_hash TEXT,
  royalty_percentage NUMERIC,
  price NUMERIC,
  max_supply INTEGER,
  current_supply INTEGER NOT NULL DEFAULT 0,
  metadata_uri TEXT,
  attributes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_metokens_owner ON metokens(owner_address);
CREATE INDEX IF NOT EXISTS idx_metokens_address ON metokens(address);
CREATE INDEX IF NOT EXISTS idx_metokens_tvl ON metokens(tvl DESC);

-- Creator profiles indexes
CREATE INDEX IF NOT EXISTS idx_creator_profiles_owner ON creator_profiles(owner_address);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_username ON creator_profiles(username);

-- Video assets indexes
CREATE INDEX IF NOT EXISTS idx_video_assets_creator ON video_assets(creator_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_status ON video_assets(status);
CREATE INDEX IF NOT EXISTS idx_video_assets_asset_id ON video_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_playback_id ON video_assets(playback_id);
CREATE INDEX IF NOT EXISTS idx_metokens_created_at ON metokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metoken_balances_user ON metoken_balances(user_address);
CREATE INDEX IF NOT EXISTS idx_metoken_balances_metoken ON metoken_balances(metoken_id);
CREATE INDEX IF NOT EXISTS idx_metoken_transactions_metoken ON metoken_transactions(metoken_id);
CREATE INDEX IF NOT EXISTS idx_metoken_transactions_user ON metoken_transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_metoken_transactions_type ON metoken_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_metoken_transactions_created_at ON metoken_transactions(created_at DESC);

-- Full-text search index for MeToken names and symbols
CREATE INDEX IF NOT EXISTS idx_metokens_search ON metokens USING gin(to_tsvector('english', name || ' ' || symbol));

-- Row Level Security (RLS) Policies
ALTER TABLE metokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE metoken_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE metoken_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for metokens table
CREATE POLICY "Anyone can view metokens" ON metokens
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own metokens" ON metokens
  FOR INSERT WITH CHECK (auth.jwt() ->> 'address' = owner_address);

CREATE POLICY "Users can update their own metokens" ON metokens
  FOR UPDATE USING (auth.jwt() ->> 'address' = owner_address);

-- Policies for metoken_balances table
CREATE POLICY "Users can view all balances" ON metoken_balances
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own balances" ON metoken_balances
  FOR INSERT WITH CHECK (auth.jwt() ->> 'address' = user_address);

CREATE POLICY "Users can update their own balances" ON metoken_balances
  FOR UPDATE USING (auth.jwt() ->> 'address' = user_address);

-- Policies for metoken_transactions table
CREATE POLICY "Users can view all transactions" ON metoken_transactions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own transactions" ON metoken_transactions
  FOR INSERT WITH CHECK (auth.jwt() ->> 'address' = user_address);

-- Policies for creator_profiles table
CREATE POLICY "Anyone can view creator profiles" ON creator_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON creator_profiles
  FOR INSERT WITH CHECK (auth.jwt() ->> 'address' = owner_address);

CREATE POLICY "Users can update their own profile" ON creator_profiles
  FOR UPDATE USING (auth.jwt() ->> 'address' = owner_address);

CREATE POLICY "Users can delete their own profile" ON creator_profiles
  FOR DELETE USING (auth.jwt() ->> 'address' = owner_address);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_metokens_updated_at 
  BEFORE UPDATE ON metokens 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metoken_balances_updated_at 
  BEFORE UPDATE ON metoken_balances 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_profiles_updated_at 
  BEFORE UPDATE ON creator_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get MeToken statistics
CREATE OR REPLACE FUNCTION get_metoken_stats(metoken_addr TEXT)
RETURNS TABLE (
  total_transactions BIGINT,
  unique_holders BIGINT,
  total_volume NUMERIC,
  avg_transaction_size NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(mt.id) as total_transactions,
    COUNT(DISTINCT mb.user_address) as unique_holders,
    COALESCE(SUM(CASE 
      WHEN mt.transaction_type IN ('mint', 'burn') THEN mt.collateral_amount 
      ELSE mt.amount 
    END), 0) as total_volume,
    CASE 
      WHEN COUNT(mt.id) > 0 THEN 
        COALESCE(SUM(CASE 
          WHEN mt.transaction_type IN ('mint', 'burn') THEN mt.collateral_amount 
          ELSE mt.amount 
        END), 0) / COUNT(mt.id)
      ELSE 0 
    END as avg_transaction_size
  FROM metoken_transactions mt
  LEFT JOIN metoken_balances mb ON mb.metoken_id = mt.metoken_id
  WHERE mt.metoken_id = (SELECT id FROM metokens WHERE address = metoken_addr);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search MeTokens
CREATE OR REPLACE FUNCTION search_metokens(search_query TEXT, result_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  address TEXT,
  owner_address TEXT,
  name TEXT,
  symbol TEXT,
  total_supply NUMERIC,
  tvl NUMERIC,
  hub_id INTEGER,
  balance_pooled NUMERIC,
  balance_locked NUMERIC,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  end_cooldown TIMESTAMP WITH TIME ZONE,
  target_hub_id INTEGER,
  migration_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.*,
    ts_rank(to_tsvector('english', m.name || ' ' || m.symbol), plainto_tsquery('english', search_query)) as rank
  FROM metokens m
  WHERE to_tsvector('english', m.name || ' ' || m.symbol) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, m.tvl DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for MeToken analytics
CREATE OR REPLACE VIEW metoken_analytics AS
SELECT 
  m.id,
  m.address,
  m.name,
  m.symbol,
  m.owner_address,
  m.tvl,
  m.total_supply,
  m.created_at,
  COUNT(DISTINCT mb.user_address) as unique_holders,
  COUNT(mt.id) as total_transactions,
  COALESCE(SUM(CASE 
    WHEN mt.transaction_type IN ('mint', 'burn') THEN mt.collateral_amount 
    ELSE mt.amount 
  END), 0) as total_volume,
  COALESCE(AVG(CASE 
    WHEN mt.transaction_type IN ('mint', 'burn') THEN mt.collateral_amount 
    ELSE mt.amount 
  END), 0) as avg_transaction_size
FROM metokens m
LEFT JOIN metoken_balances mb ON mb.metoken_id = m.id AND mb.balance > 0
LEFT JOIN metoken_transactions mt ON mt.metoken_id = m.id
GROUP BY m.id, m.address, m.name, m.symbol, m.owner_address, m.tvl, m.total_supply, m.created_at
ORDER BY m.tvl DESC;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
