# Verification Guide - Goldsky Subgraph Configuration

## ✅ Configuration Status

The application now uses **Goldsky** public endpoints for subgraph access. No authentication keys are required!

**Subgraph Endpoints:**
- **MeTokens**: `https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/1.0.2/gn`
- **Creative TV**: `https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/creative_tv/0.1/gn`

---

## 🔄 Step 1: Start Development Server

```bash
# Start or restart your dev server
yarn dev
```

---

## 🧪 Step 2: Check Server Logs

After starting, look for these messages in your terminal:

### ✅ Success Indicators
```
🔗 Forwarding to Goldsky subgraph endpoint: https://api.goldsky.com/...
✅ Goldsky subgraph query successful
```

### ❌ Failure Indicators
```
❌ Goldsky subgraph request failed
💥 Error proxying Goldsky subgraph request
```

If you see failure indicators, check your internet connection and the Goldsky service status.

---

## 🌐 Step 3: Test in Browser

1. **Open your app** in the browser (usually http://localhost:3000)

2. **Navigate to Portfolio or any page that uses MeTokens**

3. **Open Browser Console** (F12 → Console tab)

4. **Look for these success messages**:
   ```
   🔍 Fetching MeToken holdings for address: 0x...
   🔗 Querying subgraph at: http://localhost:3000/api/metokens-subgraph
   ✅ Successfully fetched N subscribe events
   📋 Found N MeTokens in subgraph
   ```

---

## 🔍 Step 4: Verify API Route

You can test the API route directly:

1. **Open a new terminal** (keep dev server running)

2. **Run this curl command**:
   ```bash
   curl -X POST http://localhost:3000/api/metokens-subgraph \
     -H "Content-Type: application/json" \
     -d '{
       "query": "query { subscribes(first: 1) { id meToken } }"
     }'
   ```

3. **Expected Response** (success):
   ```json
   {
     "data": {
       "subscribes": [...]
     }
   }
   ```

4. **Error Response** (if still failing):
   ```json
   {
     "error": "Configuration Error",
     "message": "SUBGRAPH_QUERY_KEY environment variable is not set",
     "hint": "..."
   }
   ```

---

## 🚨 Troubleshooting

### Problem: Getting 404 (Not Found) error

**Possible Causes**:
- Goldsky subgraph endpoint URL is incorrect
- Subgraph deployment ID is wrong
- Subgraph has been removed or renamed

**Current Configuration**:
- MeTokens: `https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.1/gn`
- Deployment ID: `QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53`

**Solution**:
1. Verify the endpoint URL in `/app/api/metokens-subgraph/route.ts`
2. Check Goldsky documentation for correct URL format
3. Contact subgraph maintainer for updated deployment info

---

### Problem: Getting 429 (Rate Limited) error

**Possible Causes**:
- Too many requests to Goldsky public endpoint
- Exceeded free tier rate limits

**Solution**:
1. Implement request throttling/debouncing
2. Add caching for subgraph responses
3. Contact Goldsky for higher rate limits
4. Consider upgrading to a paid Goldsky plan

---

### Problem: Getting 500 (Server Error)

**Possible Causes**:
- Goldsky subgraph is experiencing issues
- Subgraph is still syncing/indexing
- Invalid GraphQL query
- Network connectivity issues

**Solution**:
1. Check Goldsky status page
2. Wait a few minutes and try again
3. Check server logs for more details
4. Verify GraphQL query syntax
5. Test the endpoint directly with curl

---

## 📊 Expected Behavior After Fix

### Before Fix
```
❌ GraphQL Error (Code: 500)
❌ Failed to fetch MeTokens from subgraph
❌ App crashes or shows errors
```

### After Fix
```
✅ Subgraph query successful
✅ MeToken holdings displayed (or empty if none)
✅ App continues to work even if subgraph temporarily fails
✅ Clear error messages if something goes wrong
```

---

## 🎯 Success Criteria

Your setup is working correctly when:

- [ ] Dev server logs show "✅ Query key available"
- [ ] Browser console shows "✅ Successfully fetched N subscribe events"
- [ ] Portfolio page loads without errors
- [ ] MeToken holdings display (or show empty state)
- [ ] No 500 errors in browser console
- [ ] No 500 errors in server logs

---

## 📝 Quick Test Script

Test the Goldsky endpoint directly with curl:

```bash
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/1.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ subscribes(first: 1) { id meToken hubId blockTimestamp } }"
  }'
```

Or test through your API proxy:

```bash
curl -X POST http://localhost:3000/api/metokens-subgraph \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ subscribes(first: 1) { id meToken hubId blockTimestamp } }"
  }'
```

Expected response:
```json
{
  "data": {
    "subscribes": [...]
  }
}
```

---

## 🆘 Still Having Issues?

If you're still experiencing problems after following this guide:

1. **Check all three error locations**:
   - Server terminal logs
   - Browser console
   - Network tab (F12 → Network)

2. **Collect this information**:
   - Full error message from console
   - Server logs from terminal
   - Response from curl test
   - Screenshot of Network tab

3. **Common fixes**:
   - Clear Next.js cache: `rm -rf .next`
   - Clear node modules: `rm -rf node_modules && yarn install`
   - Check for typos in `.env.local`
   - Ensure no extra spaces in environment variable

---

## 📞 Support Resources

- **Goldsky Documentation**: https://docs.goldsky.com/
- **Goldsky Status**: Check Goldsky status page for service availability
- **MeTokens Subgraph**: Check the MeTokens documentation for query schemas
- **Next.js Documentation**: https://nextjs.org/docs

---

**Last Updated**: 2025-01-11
**Status**: Migrated to Goldsky ✅
**Deployment IDs:**
- MeTokens: `QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53`
- Creative TV: `QmbDp8Wfy82g8L7Mv6RCAZHRcYUQB4prQfqchvexfZR8yZ`

