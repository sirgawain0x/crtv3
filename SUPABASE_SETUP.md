# Supabase MeToken Integration Setup

## 🚀 Quick Setup Guide

### 1. Environment Variables
Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://zdeiezfoemibjgrkyzvs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWllemZvZW1pYmpncmt5enZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDU1NDYyLCJleHAiOjIwNzM0NzE0NjJ9.4WFW-6XgiupeQuNiKH4R4kgrejy0Qwi4XtSbDyRs0qU
```

### 2. Database Schema Setup
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `lib/sdk/supabase/schema.sql`
4. Run the SQL to create all tables, indexes, and functions

### 3. What's Been Implemented

#### ✅ **Database Schema**
- `metokens` table - Stores MeToken contract data
- `metoken_balances` table - Tracks user balances
- `metoken_transactions` table - Transaction history
- Full-text search indexes
- Row Level Security (RLS) policies

#### ✅ **API Routes**
- `GET /api/metokens` - List/search MeTokens
- `POST /api/metokens` - Create new MeToken
- `GET /api/metokens/[address]` - Get specific MeToken
- `PUT /api/metokens/[address]` - Update MeToken data
- `GET /api/metokens/[address]/transactions` - Get transaction history
- `POST /api/metokens/[address]/transactions` - Record transactions
- `GET /api/metokens/[address]/stats` - Get MeToken statistics

#### ✅ **React Hooks**
- `useMeTokensSupabase()` - Supabase-based MeToken management
- Real-time updates via Supabase subscriptions
- Automatic balance and transaction tracking

#### ✅ **UI Components Updated**
- `MeTokensSection` - Now uses Supabase for data
- `MeTokenCreator` - Integrated with Supabase storage
- `MeTokenTrading` - Real-time balance updates

### 4. Key Benefits

#### 🚀 **Performance**
- **Instant Loading**: No more waiting for subgraph indexing
- **Fast Queries**: Optimized database queries with proper indexes
- **Real-time Updates**: Live updates when MeToken data changes

#### 🔍 **Rich Features**
- **Full-text Search**: Search MeTokens by name, symbol, or creator
- **Analytics**: Built-in statistics and metrics
- **Transaction History**: Complete audit trail
- **Trending MeTokens**: Sort by TVL, creation date, etc.

#### 🛡️ **Reliability**
- **Offline Support**: Cached data for better UX
- **Error Handling**: Robust error handling and retry logic
- **Data Consistency**: ACID transactions ensure data integrity

### 5. Usage Examples

#### **Create a MeToken**
```typescript
const { createMeToken } = useMeTokensSupabase();
await createMeToken('My Token', 'MTK');
// Automatically stored in Supabase
```

#### **Search MeTokens**
```typescript
const meTokens = await meTokenSupabaseService.searchMeTokens('creative', 10);
```

#### **Get User's MeToken**
```typescript
const meToken = await meTokenSupabaseService.getMeTokenByOwner(userAddress);
```

#### **Real-time Updates**
```typescript
// Automatically subscribes to balance changes
const subscription = meTokenSupabaseService.subscribeToBalanceUpdates(
  userAddress, 
  (payload) => console.log('Balance updated:', payload)
);
```

### 6. Migration from Subgraph

The new system is backward compatible. You can:

1. **Keep both systems** running in parallel during transition
2. **Gradually migrate** users to the Supabase-based system
3. **Use Supabase as primary** with subgraph as fallback

### 7. Next Steps

1. **Set up the database schema** in Supabase
2. **Add environment variables** to your `.env.local`
3. **Test the integration** with your existing MeToken
4. **Monitor performance** and adjust as needed

### 8. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metokens` | GET | List all MeTokens with filtering |
| `/api/metokens` | POST | Create new MeToken |
| `/api/metokens/[address]` | GET | Get specific MeToken |
| `/api/metokens/[address]` | PUT | Update MeToken data |
| `/api/metokens/[address]/transactions` | GET | Get transaction history |
| `/api/metokens/[address]/transactions` | POST | Record new transaction |
| `/api/metokens/[address]/stats` | GET | Get MeToken statistics |

### 9. Database Functions

- `get_metoken_stats(address)` - Get comprehensive MeToken statistics
- `search_metokens(query, limit)` - Full-text search with ranking
- `metoken_analytics` view - Pre-computed analytics data

This integration provides a much more robust and performant solution for MeToken data management compared to relying solely on subgraph queries and direct contract calls.
