-- Enhanced MeTokens Supabase Database Schema
-- This schema supports Alchemy SDK integration and advanced metoken features

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- MeTokens table (enhanced)
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
  -- Alchemy SDK integration fields
  creation_method TEXT DEFAULT 'factory', -- 'factory', 'alchemy', 'manual'
  alchemy_transaction_hash TEXT,
  gas_used BIGINT,
  gas_price NUMERIC,
  block_number BIGINT,
  -- Metadata fields
  description TEXT,
  website_url TEXT,
  twitter_handle TEXT,
  discord_url TEXT,
  -- Status tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'migrating', 'inactive')),
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MeToken balances for users (enhanced)
CREATE TABLE IF NOT EXISTS metoken_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metoken_id UUID REFERENCES metokens(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  -- Alchemy SDK tracking
  last_transaction_hash TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(metoken_id, user_address)
);

-- MeToken transactions/history (enhanced)
CREATE TABLE IF NOT EXISTS metoken_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metoken_id UUID REFERENCES metokens(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('mint', 'burn', 'transfer', 'create', 'subscribe', 'donate')),
  amount NUMERIC NOT NULL DEFAULT 0,
  collateral_amount NUMERIC, -- For mint/burn transactions
  transaction_hash TEXT,
  block_number BIGINT,
  -- Alchemy SDK fields
  gas_used BIGINT,
  gas_price NUMERIC,
  effective_gas_price NUMERIC,
  -- Additional metadata
  from_address TEXT,
  to_address TEXT,
  hub_id INTEGER,
  me_tokens_minted NUMERIC,
  assets_returned NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creator Profiles table (enhanced)
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address TEXT UNIQUE NOT NULL, -- Creator's wallet address
  username TEXT,
  bio TEXT,
  avatar_url TEXT, -- URL to avatar image in Supabase Storage
  -- Social links
  website_url TEXT,
  twitter_handle TEXT,
  discord_url TEXT,
  telegram_url TEXT,
  -- Verification status
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP WITH TIME ZONE,
  -- Alchemy SDK integration
  alchemy_user_id TEXT,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MeToken Analytics table (new)
CREATE TABLE IF NOT EXISTS metoken_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metoken_id UUID REFERENCES metokens(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- Trading metrics
  volume_24h NUMERIC DEFAULT 0,
  trades_24h INTEGER DEFAULT 0,
  unique_traders_24h INTEGER DEFAULT 0,
  -- Price metrics
  price_usd NUMERIC,
  market_cap NUMERIC,
  -- Liquidity metrics
  liquidity_pooled NUMERIC DEFAULT 0,
  liquidity_locked NUMERIC DEFAULT 0,
  -- Social metrics
  holders_count INTEGER DEFAULT 0,
  new_holders_24h INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(metoken_id, date)
);

-- Alchemy SDK Integration table (new)
CREATE TABLE IF NOT EXISTS alchemy_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  alchemy_user_id TEXT,
  api_key_hash TEXT, -- Hashed API key for reference
  -- Integration settings
  auto_sync BOOLEAN DEFAULT TRUE,
  sync_frequency_minutes INTEGER DEFAULT 60,
  -- Status tracking
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_address)
);

-- Gas Optimization table (new)
CREATE TABLE IF NOT EXISTS gas_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_hash TEXT NOT NULL,
  metoken_id UUID REFERENCES metokens(id) ON DELETE CASCADE,
  -- Gas metrics
  estimated_gas BIGINT,
  actual_gas_used BIGINT,
  gas_price_gwei NUMERIC,
  effective_gas_price_gwei NUMERIC,
  gas_savings_percentage NUMERIC,
  -- Optimization method
  optimization_method TEXT, -- 'alchemy_transact', 'gas_estimation', 'manual'
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_metokens_owner_address ON metokens(owner_address);
CREATE INDEX IF NOT EXISTS idx_metokens_hub_id ON metokens(hub_id);
CREATE INDEX IF NOT EXISTS idx_metokens_status ON metokens(status);
CREATE INDEX IF NOT EXISTS idx_metokens_created_at ON metokens(created_at);
CREATE INDEX IF NOT EXISTS idx_metokens_tvl ON metokens(tvl DESC);

CREATE INDEX IF NOT EXISTS idx_metoken_balances_user_address ON metoken_balances(user_address);
CREATE INDEX IF NOT EXISTS idx_metoken_balances_metoken_id ON metoken_balances(metoken_id);

CREATE INDEX IF NOT EXISTS idx_metoken_transactions_metoken_id ON metoken_transactions(metoken_id);
CREATE INDEX IF NOT EXISTS idx_metoken_transactions_user_address ON metoken_transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_metoken_transactions_type ON metoken_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_metoken_transactions_created_at ON metoken_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_metoken_transactions_hash ON metoken_transactions(transaction_hash);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_owner_address ON creator_profiles(owner_address);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_username ON creator_profiles(username);

CREATE INDEX IF NOT EXISTS idx_metoken_analytics_metoken_id ON metoken_analytics(metoken_id);
CREATE INDEX IF NOT EXISTS idx_metoken_analytics_date ON metoken_analytics(date);

CREATE INDEX IF NOT EXISTS idx_alchemy_integrations_user_address ON alchemy_integrations(user_address);
CREATE INDEX IF NOT EXISTS idx_alchemy_integrations_sync_status ON alchemy_integrations(sync_status);

CREATE INDEX IF NOT EXISTS idx_gas_optimizations_transaction_hash ON gas_optimizations(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_gas_optimizations_metoken_id ON gas_optimizations(metoken_id);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_metokens_search ON metokens USING gin(to_tsvector('english', name || ' ' || symbol || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_creator_profiles_search ON creator_profiles USING gin(to_tsvector('english', username || ' ' || COALESCE(bio, '')));

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE metokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE metoken_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE metoken_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE metoken_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alchemy_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_optimizations ENABLE ROW LEVEL SECURITY;

-- MeTokens policies
CREATE POLICY "Public read access for metokens" ON metokens
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own metokens" ON metokens
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = owner_address);

CREATE POLICY "Users can update their own metokens" ON metokens
  FOR UPDATE USING (auth.jwt() ->> 'sub' = owner_address);

-- MeToken balances policies
CREATE POLICY "Public read access for metoken_balances" ON metoken_balances
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own balances" ON metoken_balances
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_address);

CREATE POLICY "Users can update their own balances" ON metoken_balances
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_address);

-- MeToken transactions policies
CREATE POLICY "Public read access for metoken_transactions" ON metoken_transactions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own transactions" ON metoken_transactions
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_address);

-- Creator profiles policies
CREATE POLICY "Public read access for creator_profiles" ON creator_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profiles" ON creator_profiles
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = owner_address);

CREATE POLICY "Users can update their own profiles" ON creator_profiles
  FOR UPDATE USING (auth.jwt() ->> 'sub' = owner_address);

-- MeToken analytics policies
CREATE POLICY "Public read access for metoken_analytics" ON metoken_analytics
  FOR SELECT USING (true);

-- Alchemy integrations policies
CREATE POLICY "Users can manage their own alchemy integrations" ON alchemy_integrations
  FOR ALL USING (auth.jwt() ->> 'sub' = user_address);

-- Gas optimizations policies
CREATE POLICY "Public read access for gas_optimizations" ON gas_optimizations
  FOR SELECT USING (true);

-- Video assets policies
CREATE POLICY "Public read access for published video assets" ON video_assets
  FOR SELECT USING (status = 'published');

CREATE POLICY "Creators can view their own video assets" ON video_assets
  FOR SELECT USING (auth.jwt() ->> 'sub' = creator_id);

CREATE POLICY "Creators can insert their own video assets" ON video_assets
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = creator_id);

CREATE POLICY "Creators can update their own video assets" ON video_assets
  FOR UPDATE USING (auth.jwt() ->> 'sub' = creator_id);

CREATE POLICY "Creators can delete their own video assets" ON video_assets
  FOR DELETE USING (auth.jwt() ->> 'sub' = creator_id);

-- Functions for automatic updates

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_metokens_updated_at BEFORE UPDATE ON metokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metoken_balances_updated_at BEFORE UPDATE ON metoken_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alchemy_integrations_updated_at BEFORE UPDATE ON alchemy_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_assets_updated_at BEFORE UPDATE ON video_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to sync MeToken data from blockchain
CREATE OR REPLACE FUNCTION sync_metoken_from_blockchain(metoken_address TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  metoken_record RECORD;
BEGIN
  -- This function would be called by a background job or webhook
  -- to sync MeToken data from the blockchain using Alchemy SDK
  
  SELECT * INTO metoken_record FROM metokens WHERE address = metoken_address;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update last_sync_at timestamp
  UPDATE metokens 
  SET last_sync_at = NOW() 
  WHERE address = metoken_address;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate MeToken TVL
CREATE OR REPLACE FUNCTION calculate_metoken_tvl(metoken_address TEXT)
RETURNS NUMERIC AS $$
DECLARE
  total_tvl NUMERIC;
BEGIN
  SELECT (balance_pooled + balance_locked) INTO total_tvl
  FROM metokens 
  WHERE address = metoken_address;
  
  RETURN COALESCE(total_tvl, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get MeToken statistics
CREATE OR REPLACE FUNCTION get_metoken_stats(metoken_address TEXT)
RETURNS TABLE (
  total_holders INTEGER,
  total_volume_24h NUMERIC,
  total_trades_24h INTEGER,
  current_price_usd NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT user_address)::INTEGER as total_holders,
    COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN amount ELSE 0 END), 0) as total_volume_24h,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END)::INTEGER as total_trades_24h,
    -- This would be calculated from external price feeds
    0::NUMERIC as current_price_usd
  FROM metoken_transactions mt
  JOIN metokens m ON mt.metoken_id = m.id
  WHERE m.address = metoken_address;
END;
$$ LANGUAGE plpgsql;

-- Views for common queries

-- View for MeToken overview with creator info
CREATE OR REPLACE VIEW metoken_overview 
WITH (security_invoker=true) AS
SELECT 
  m.*,
  cp.username as creator_username,
  cp.avatar_url as creator_avatar,
  (m.balance_pooled + m.balance_locked) as total_liquidity,
  COUNT(DISTINCT mb.user_address) as holder_count
FROM metokens m
LEFT JOIN creator_profiles cp ON m.owner_address = cp.owner_address
LEFT JOIN metoken_balances mb ON m.id = mb.metoken_id
GROUP BY m.id, cp.username, cp.avatar_url;

-- View for MeToken trading activity
CREATE OR REPLACE VIEW metoken_trading_activity 
WITH (security_invoker=true) AS
SELECT 
  m.address as metoken_address,
  m.name as metoken_name,
  m.symbol as metoken_symbol,
  COUNT(mt.id) as total_transactions,
  SUM(mt.amount) as total_volume,
  COUNT(DISTINCT mt.user_address) as unique_traders,
  MAX(mt.created_at) as last_activity
FROM metokens m
LEFT JOIN metoken_transactions mt ON m.id = mt.metoken_id
WHERE mt.transaction_type IN ('mint', 'burn', 'transfer')
GROUP BY m.id, m.address, m.name, m.symbol;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON metokens TO authenticated;
GRANT INSERT, UPDATE, DELETE ON metoken_balances TO authenticated;
GRANT INSERT ON metoken_transactions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON creator_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON video_assets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON alchemy_integrations TO authenticated;

-- Grant access to views
GRANT SELECT ON metoken_overview TO anon, authenticated;
GRANT SELECT ON metoken_trading_activity TO anon, authenticated;
