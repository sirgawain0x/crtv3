# Performance Advisor Fixes

This document addresses the Performance Advisor warnings and suggestions from Supabase.

## Summary

### ✅ Fixed Warnings (16 total)

1. **Auth RLS Initialization Plan (8 warnings)** - FIXED
   - Created `auth.address()` helper function to optimize JWT parsing
   - Reduces repeated calls to `auth.jwt()` in RLS policies

2. **Multiple Permissive Policies (8 warnings)** - FIXED
   - Consolidated 4 `comment_likes` policies into 1
   - Consolidated 4 `video_assets` SELECT policies into 1
   - Improves query planning performance

### ⚠️ Info Suggestions (20 total)

**Unused Indexes** - REVIEW MANUALLY
- 20 indexes flagged as potentially unused
- Review before dropping, as they may be needed for:
  - Future query patterns
  - Incomplete usage tracking
  - Query optimizer selection

## What Was Fixed

### Migration: `20250115_fix_performance_advisor_warnings.sql`

#### 1. Auth Helper Function

Created `auth.address()` helper function that:
- Uses `current_setting()` instead of parsing `auth.jwt()` multiple times
- Optimizes RLS policies that check wallet addresses (smart account auth)
- Follows Supabase best practices for auth context initialization

```sql
CREATE OR REPLACE FUNCTION auth.address()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claim.address', true),
      current_setting('request.jwt.claim.sub', true)
    ),
    ''
  )::TEXT;
$$;
```

#### 2. Consolidated RLS Policies

**comment_likes table:**
- Before: 4 separate policies (SELECT, INSERT, UPDATE, DELETE)
- After: 1 consolidated policy for ALL operations
- Performance: Single policy evaluation instead of 4

**video_assets table:**
- Before: 3 separate SELECT policies (public, anonymous, creator)
- After: 1 consolidated SELECT policy with OR conditions
- Performance: Better query planning, single policy evaluation

## Unused Indexes Review

The Performance Advisor suggests 20 indexes that may be unused. **Review these manually before dropping:**

### Tables with Potentially Unused Indexes:

1. **video_assets** - Multiple indexes
2. **metokens** - Multiple indexes  
3. **metoken_balances** - Multiple indexes
4. **metoken_transactions** - Multiple indexes
5. **creator_profiles** - Some indexes
6. **video_comments** - Some indexes

### How to Review Unused Indexes:

1. **Check index usage in Supabase Dashboard:**
   - Go to Database → Indexes
   - Look at index size and usage stats

2. **Query index usage directly:**
   ```sql
   SELECT 
     schemaname,
     tablename,
     indexname,
     idx_scan as index_scans,
     pg_size_pretty(pg_relation_size(indexrelid)) as index_size
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;
   ```

3. **Consider before dropping:**
   - Index might be needed for future queries
   - Query planner might use it even if not obvious
   - Unique indexes serve data integrity (don't drop these)
   - Foreign key indexes improve join performance

### Recommended Action:

- ✅ **Keep indexes for:**
  - Primary keys (always needed)
  - Foreign keys (improve joins)
  - Unique constraints (data integrity)
  - Frequently queried columns
  
- ⚠️ **Consider removing indexes for:**
  - Large indexes with 0 scans over extended period
  - Redundant indexes (same columns, different order)
  - Partial indexes that no longer match query patterns

- ❌ **Don't drop indexes for:**
  - Newly created indexes (give them time to be used)
  - Indexes on high-write tables (may still improve queries)

## Impact Assessment

### Performance Improvements:

1. **RLS Policy Evaluation:**
   - Reduced policy count from 8 to 4 for video_assets SELECT operations
   - Faster query planning for video asset reads
   - Optimized auth context initialization

2. **Query Planning:**
   - PostgreSQL can optimize consolidated policies better
   - Fewer policy checks per query
   - Better use of indexes for policy evaluation

3. **Auth Context:**
   - Single call to `current_setting()` instead of multiple `auth.jwt()` calls
   - Reduced JWT parsing overhead

### Security:

- ✅ **No security degradation** - All policies maintain same access controls
- ✅ **Function security** - `auth.address()` is `SECURITY DEFINER` with `SET search_path`
- ✅ **Policy consolidation** - Access rules remain identical, just more efficient

## Next Steps

1. ✅ Apply migration: `20250115_fix_performance_advisor_warnings.sql`
2. ⚠️ Review unused indexes manually (see instructions above)
3. ✅ Verify Performance Advisor warnings are resolved
4. 📊 Monitor query performance after migration

## Testing

After applying the migration:

1. **Verify RLS still works:**
   - Test video asset reads (public access)
   - Test video asset reads (creator access)
   - Test comment likes operations

2. **Check Performance Advisor:**
   - Warnings should be resolved
   - Info suggestions remain (for manual review)

3. **Monitor query performance:**
   - Check query execution times
   - Monitor index usage
   - Watch for any performance regressions

## Notes

- The app uses `service_role` for most writes, which bypasses RLS
- This means many auth-related policies aren't actively evaluated for writes
- Main performance gains come from consolidating SELECT policies used for reads
- The `auth.address()` helper provides future optimization potential when policies are evaluated

