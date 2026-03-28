# MeTokens OrbisDB to Supabase Migration

This document outlines the complete migration from OrbisDB (Ceramic Network) to Supabase for storing meTokens creator metadata.

## Overview

The migration replaces the decentralized OrbisDB storage system with a centralized Supabase PostgreSQL database, providing:

- **Structured Data Storage**: PostgreSQL tables with proper relationships
- **Row Level Security (RLS)**: Secure access control for creator profiles
- **File Storage**: Supabase Storage for avatar images
- **Real-time Updates**: Live subscriptions for profile changes
- **Better Performance**: Faster queries and reduced complexity

## Architecture Changes

### Before (OrbisDB)
```
MeToken Contract → getMeTokenInfo() → Owner Address → OrbisDB → Profile Data
```

### After (Supabase)
```
MeToken Contract → getMeTokenInfo() → Owner Address → Supabase → Profile Data
```

## Database Schema

### Creator Profiles Table
```sql
CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address TEXT UNIQUE NOT NULL, -- Creator's wallet address
  username TEXT,
  bio TEXT,
  avatar_url TEXT, -- URL to avatar image in Supabase Storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security Policies
- **Public Read**: Anyone can view creator profiles
- **Owner Write**: Only the profile owner can create/update/delete their profile
- **Authentication**: Uses JWT claims to verify ownership

## File Structure

### New Files Created
```
lib/sdk/supabase/
├── creator-profiles.ts          # Creator profile service
├── storage.ts                   # Avatar upload/storage service
└── schema.sql                   # Updated database schema

lib/hooks/metokens/
├── useCreatorProfile.ts         # React hook for profile management
└── useAvatarUpload.ts           # React hook for avatar uploads

components/UserProfile/
├── CreatorProfileManager.tsx    # Profile management component
├── CreatorProfileDisplay.tsx    # Profile display component
└── AvatarUpload.tsx             # Avatar upload component

app/api/creator-profiles/
├── route.ts                     # CRUD API endpoints
└── upsert/route.ts              # Upsert endpoint

scripts/
├── migrate-orbis-to-supabase.ts # Migration script
└── test-supabase-integration.ts # Integration tests
```

## Setup Instructions

### 1. Database Setup

Run the updated schema in your Supabase SQL editor:

```bash
# Copy the contents of lib/sdk/supabase/schema.sql
# Paste into Supabase SQL editor and execute
```

### 2. Storage Setup

Initialize the storage bucket:

```typescript
import { supabaseStorageService } from '@/lib/sdk/supabase/storage';

// Run this once to create the bucket
await supabaseStorageService.initializeBucket();
```

### 3. Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Migration Process

### 1. Run Migration Script

```bash
# Install dependencies if needed
npm install tsx

# Run migration script
npx tsx scripts/migrate-orbis-to-supabase.ts
```

### 2. Test Integration

```bash
# Run integration tests
npx tsx scripts/test-supabase-integration.ts
```

### 3. Update Components

The following components have been updated to use Supabase:

- `MeTokensSection.tsx` - Added profile management tab
- `MeTokenCreator.tsx` - No changes needed (uses existing hooks)
- `UserProfile.tsx` - Can now display creator profiles

## API Endpoints

### Creator Profiles API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/creator-profiles?owner={address}` | Get profile by owner address |
| GET | `/api/creator-profiles?search={query}` | Search profiles |
| POST | `/api/creator-profiles` | Create new profile |
| PUT | `/api/creator-profiles` | Update existing profile |
| DELETE | `/api/creator-profiles?owner={address}` | Delete profile |
| POST | `/api/creator-profiles/upsert` | Create or update profile |

### Example Usage

```typescript
// Get creator profile
const response = await fetch('/api/creator-profiles?owner=0x123...');
const { data: profile } = await response.json();

// Create/update profile
const response = await fetch('/api/creator-profiles/upsert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner_address: '0x123...',
    username: 'CreatorName',
    bio: 'Creator bio',
    avatar_url: 'https://...'
  })
});
```

## React Hooks

### useCreatorProfile

```typescript
import { useCreatorProfile } from '@/lib/hooks/metokens/useCreatorProfile';

function MyComponent() {
  const { 
    profile, 
    loading, 
    error, 
    updateProfile, 
    upsertProfile 
  } = useCreatorProfile('0x123...');

  // Use profile data
}
```

### useAvatarUpload

```typescript
import { useAvatarUpload } from '@/lib/hooks/metokens/useAvatarUpload';

function MyComponent() {
  const { 
    isUploading, 
    uploadAvatar, 
    deleteAvatar 
  } = useAvatarUpload('0x123...');

  // Handle file uploads
}
```

## Components

### CreatorProfileManager

```tsx
import { CreatorProfileManager } from '@/components/UserProfile/CreatorProfileManager';

<CreatorProfileManager 
  targetAddress="0x123..." 
  onProfileUpdated={() => {}} 
/>
```

### CreatorProfileDisplay

```tsx
import { CreatorProfileDisplay } from '@/components/UserProfile/CreatorProfileDisplay';

<CreatorProfileDisplay 
  ownerAddress="0x123..." 
  meTokenName="TokenName"
  meTokenSymbol="SYMBOL"
/>
```

### AvatarUpload

```tsx
import { AvatarUpload } from '@/components/UserProfile/AvatarUpload';

<AvatarUpload 
  targetAddress="0x123..." 
  size="md"
  onUploadComplete={(url) => console.log(url)}
/>
```

## Storage Management

### Avatar Upload

```typescript
import { supabaseStorageService } from '@/lib/sdk/supabase/storage';

// Upload avatar
const result = await supabaseStorageService.uploadAvatar(file, ownerAddress);

// Delete avatar
const result = await supabaseStorageService.deleteAvatar(ownerAddress);

// Get avatar URL
const url = supabaseStorageService.getAvatarUrl(ownerAddress);
```

## Security Considerations

### Row Level Security (RLS)

- Profiles are publicly readable but only editable by the owner
- Authentication is handled via JWT claims
- File uploads are restricted to authenticated users

### File Upload Security

- File type validation (images only)
- File size limits (5MB max)
- Automatic file naming to prevent conflicts

## Performance Optimizations

### Database Indexes

```sql
CREATE INDEX idx_creator_profiles_owner ON creator_profiles(owner_address);
CREATE INDEX idx_creator_profiles_username ON creator_profiles(username);
```

### Caching

- React hooks implement proper caching
- Real-time subscriptions for live updates
- Optimistic updates for better UX

## Monitoring and Maintenance

### Health Checks

```typescript
// Check database connection
const { data, error } = await supabase.from('creator_profiles').select('count').limit(1);

// Check storage bucket
const info = await supabaseStorageService.getStorageInfo();
```

### Backup Strategy

- Supabase provides automatic backups
- Export data regularly for additional safety
- Monitor storage usage and costs

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure policies are correctly configured
2. **Storage Upload Failures**: Check bucket permissions and file size limits
3. **Authentication Issues**: Verify JWT claims and user authentication

### Debug Mode

```typescript
// Enable debug logging
localStorage.setItem('supabase-debug', 'true');
```

## Migration Checklist

- [ ] Database schema created
- [ ] Storage bucket initialized
- [ ] RLS policies configured
- [ ] Migration script executed
- [ ] Integration tests passed
- [ ] Components updated
- [ ] API endpoints tested
- [ ] Documentation updated

## Rollback Plan

If issues arise, you can:

1. **Disable Supabase components**: Comment out new components
2. **Revert to OrbisDB**: Use existing OrbisDB hooks
3. **Database rollback**: Drop creator_profiles table if needed

## Future Enhancements

- **Profile Verification**: Add verification badges
- **Social Features**: Follow/unfollow creators
- **Analytics**: Track profile views and engagement
- **Advanced Search**: Full-text search with filters
- **Profile Templates**: Predefined profile layouts

## Support

For issues or questions:

1. Check the integration tests: `npx tsx scripts/test-supabase-integration.ts`
2. Review the migration logs
3. Check Supabase dashboard for errors
4. Verify environment variables are set correctly

---

**Migration completed successfully!** 🎉

The meTokens creator profile system now uses Supabase for improved performance, security, and maintainability.

