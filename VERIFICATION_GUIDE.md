# Verification Guide - Subgraph Configuration

## ✅ Configuration Status

Your `SUBGRAPH_QUERY_KEY` is set in `.env.local`. Now let's verify everything is working.

---

## 🔄 Step 1: Restart Development Server

**IMPORTANT**: Environment variables are only loaded when the server starts.

If your dev server is currently running:
```bash
# Stop the server (Ctrl+C)
# Then restart it
yarn dev
```

---

## 🧪 Step 2: Check Server Logs

After restarting, look for these messages in your terminal:

### ✅ Success Indicators
```
✅ Query key available
🔗 Forwarding to subgraph endpoint: https://subgraph.satsuma-prod.com/***/...
```

### ❌ Failure Indicators
```
❌ SUBGRAPH_QUERY_KEY environment variable is not set
💡 Please set SUBGRAPH_QUERY_KEY in your environment variables
```

If you see failure indicators AFTER restarting, the environment variable might not be loaded correctly.

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

### Problem: Still getting "SUBGRAPH_QUERY_KEY not set" error

**Solution 1: Verify .env.local location**
```bash
# From project root
ls -la .env.local
# Should show the file exists
```

**Solution 2: Check file format**
```bash
# View the file
cat .env.local | grep SUBGRAPH_QUERY_KEY
# Should show: SUBGRAPH_QUERY_KEY=81c207136f1d
```

**Solution 3: Restart server properly**
```bash
# Make sure to kill all Next.js processes
pkill -f "next dev"
# Then start fresh
yarn dev
```

---

### Problem: Getting 401 (Unauthorized) error

**Possible Causes**:
- API key is invalid or expired
- API key doesn't have access to this subgraph

**Solution**:
1. Visit https://app.satsuma.xyz/
2. Verify your API key is active
3. Check if key has access to the MeTokens subgraph
4. Generate a new key if needed
5. Update `.env.local` with new key
6. Restart dev server

---

### Problem: Getting 404 (Not Found) error

**Possible Causes**:
- Subgraph name or deployment is incorrect
- Subgraph has been unpublished or moved

**Current Configuration**:
```
https://subgraph.satsuma-prod.com/{KEY}/creative-organization-dao--378139/metokens/api
```

**Solution**:
1. Verify the subgraph exists at Satsuma
2. Check if the URL path is correct
3. Contact subgraph maintainer if needed

---

### Problem: Getting 500 (Server Error)

**Possible Causes**:
- Subgraph is experiencing issues
- Subgraph is still syncing/indexing
- Invalid GraphQL query

**Solution**:
1. Check Satsuma status page
2. Wait a few minutes and try again
3. Check server logs for more details
4. Verify GraphQL query syntax

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

Create a test file to verify subgraph access:

```typescript
// test-subgraph.ts
import { meTokensSubgraph } from './lib/sdk/metokens/subgraph';

async function testSubgraph() {
  try {
    console.log('🧪 Testing subgraph connection...');
    const meTokens = await meTokensSubgraph.getAllMeTokens(5, 0);
    console.log('✅ Success! Found', meTokens.length, 'MeTokens');
    console.log('MeTokens:', meTokens);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSubgraph();
```

Run with:
```bash
npx tsx test-subgraph.ts
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

- **Satsuma Dashboard**: https://app.satsuma.xyz/
- **Subgraph Documentation**: Check the MeTokens subgraph docs
- **Next.js Environment Variables**: https://nextjs.org/docs/basic-features/environment-variables

---

**Last Updated**: 2025-01-10
**Status**: Configuration verified ✅

