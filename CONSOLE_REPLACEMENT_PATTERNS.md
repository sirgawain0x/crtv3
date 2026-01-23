# Console Replacement Patterns

## Quick Reference

### Server-Side Files (API Routes, Server Actions)
**Location**: `app/api/**/*.ts`, `app/actions/**/*.ts`, `app/**/actions.ts`

**Import**:
```typescript
import { serverLogger } from '@/lib/utils/logger';
```

**Replacements**:
- `console.log(...)` → `serverLogger.debug(...)`
- `console.error(...)` → `serverLogger.error(...)`
- `console.warn(...)` → `serverLogger.warn(...)`
- `console.info(...)` → `serverLogger.info(...)`
- `console.debug(...)` → `serverLogger.debug(...)`

### Client-Side Files (Components, Client Hooks)
**Location**: `components/**/*.tsx`, `app/**/page.tsx` (client components), `lib/hooks/**/*.ts` (client hooks)

**Import**:
```typescript
import { logger } from '@/lib/utils/logger';
```

**Replacements**:
- `console.log(...)` → `logger.debug(...)`
- `console.error(...)` → `logger.error(...)`
- `console.warn(...)` → `logger.warn(...)`
- `console.info(...)` → `logger.info(...)`
- `console.debug(...)` → `logger.debug(...)`

### Mixed Context Files (lib/)
**Location**: `lib/**/*.ts`

**Decision**:
- If used in API routes/server actions → `serverLogger`
- If used in components/client hooks → `logger`
- If used in both → Use `logger` (more common) or create separate exports

**Import**:
```typescript
import { logger } from '@/lib/utils/logger';
// OR
import { serverLogger } from '@/lib/utils/logger';
```

## Examples

### Before (Server-Side)
```typescript
export async function POST(request: NextRequest) {
  try {
    console.log('Request received:', body);
    // ... code ...
    console.error('Error occurred:', error);
  } catch (error) {
    console.error('Failed:', error);
  }
}
```

### After (Server-Side)
```typescript
import { serverLogger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    serverLogger.debug('Request received:', body);
    // ... code ...
    serverLogger.error('Error occurred:', error);
  } catch (error) {
    serverLogger.error('Failed:', error);
  }
}
```

### Before (Client-Side)
```typescript
"use client";

export function MyComponent() {
  useEffect(() => {
    console.log('Component mounted');
    console.error('Something went wrong');
  }, []);
}
```

### After (Client-Side)
```typescript
"use client";
import { logger } from '@/lib/utils/logger';

export function MyComponent() {
  useEffect(() => {
    logger.debug('Component mounted');
    logger.error('Something went wrong');
  }, []);
}
```

## Files to Skip

**DO NOT replace console statements in**:
- `lib/utils/logger.ts` - This is the logger implementation itself
- Test files (if any) - May need console for test output
- Build scripts - May need console for build output

## Verification

After replacement, verify:
1. Import statement is added at top of file
2. All console.* calls are replaced
3. No console statements remain (except in logger.ts)
4. Code still compiles without errors

## Automated Replacement (Future)

For bulk replacement, you could use:
```bash
# Find all console statements
grep -r "console\.\(log\|error\|warn\|debug\|info\)" app/ components/ lib/ --include="*.ts" --include="*.tsx"

# Then manually replace using the patterns above
```
