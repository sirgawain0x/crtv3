# Quick Fix Guide for Console Errors

## 🚨 Seeing MeTokens Subgraph Error (500)?

### Quick Fix
1. Get your API key from https://app.satsuma.xyz/
2. Add to `.env.local`:
   ```
   SUBGRAPH_QUERY_KEY=your_key_here
   ```
3. Restart dev server: `yarn dev`

### What Changed
- App now continues to work even if subgraph fails
- Better error messages tell you exactly what's wrong
- Portfolio page shows empty holdings instead of crashing

---

## 🎬 Seeing "CreateThumbnail: No asset ID provided"?

### What It Means
The video upload didn't complete successfully before moving to thumbnail step.

### Quick Fix
- Click the "Go Back" button in the UI
- Try uploading your video again
- Check console for upload errors

### What Changed
- UI now shows clear error message when asset is missing
- Added "Go Back" button for easy recovery
- Better logging to track upload flow
- Validation prevents invalid state transitions

---

## 🔍 How to Debug Issues

### Console Logs
Look for emoji prefixes:
- 🔍 = Searching/querying
- ✅ = Success
- ❌ = Error
- ⚠️ = Warning
- 💡 = Hint/suggestion
- 📊 = Status/info

### Common Issues

#### Issue: Subgraph always fails
**Check:**
1. Is `SUBGRAPH_QUERY_KEY` set in `.env.local`?
2. Did you restart the dev server after adding it?
3. Is the key valid? Test at https://app.satsuma.xyz/

#### Issue: Video upload stuck
**Check:**
1. Is the file size reasonable? (< 1GB recommended)
2. Is the format supported? (MP4, MOV, WebM)
3. Check browser network tab for failed requests
4. Look for Livepeer API errors in console

#### Issue: Thumbnail generation fails
**Check:**
1. Did video transcoding complete? (should show "ready")
2. Is asset ID present in console logs?
3. Are there any CORS errors in network tab?

---

## 📋 Quick Checklist

Before reporting an issue:
- [ ] Check all environment variables are set
- [ ] Restart dev server after config changes
- [ ] Clear browser cache and cookies
- [ ] Check console for emoji-prefixed error messages
- [ ] Check network tab for failed API requests
- [ ] Try in incognito/private window

---

## 🆘 Still Having Issues?

### Collect This Info:
1. Console error messages (full text)
2. Network tab screenshots (failed requests)
3. Environment variables (without sensitive values)
4. Steps to reproduce

### Where to Look:
1. **Server logs**: Check your terminal running `yarn dev`
2. **Browser console**: F12 → Console tab
3. **Network requests**: F12 → Network tab
4. **React DevTools**: Check component props/state

---

## 🎯 Quick Wins

### Performance
- Enable compression (already configured)
- Use concurrent requests (implemented)
- Batch requests under 50 items (implemented)

### Security
- Never expose API keys in frontend
- Use environment variables
- API keys in headers (not URLs)

### Reliability
- Implement retry logic (TODO)
- Use exponential backoff (TODO)
- Handle timeouts gracefully (implemented)

---

## 📚 Related Documentation

- Full error fixes: `ERROR_FIXES_SUMMARY.md`
- MeTokens setup: `METOKENS_SETUP.md`
- Video upload: `METOKEN_VIDEO_UPLOAD_FEATURE.md`
- Supabase setup: `SUPABASE_SETUP.md`

---

## 🔄 Recent Changes

### Files Modified
1. `app/api/metokens-subgraph/route.ts` - Better error handling
2. `lib/sdk/metokens/subgraph.ts` - Enhanced error messages
3. `lib/hooks/metokens/useMeTokenHoldings.ts` - Graceful degradation
4. `components/Videos/Upload/index.tsx` - State management
5. `components/Videos/Upload/Create-thumbnail.tsx` - UI error handling

### What's Better
- ✅ No more silent failures
- ✅ Clear error messages
- ✅ Easy recovery options
- ✅ Better debugging info
- ✅ App doesn't crash on errors

---

**Last Updated**: 2025-01-10

