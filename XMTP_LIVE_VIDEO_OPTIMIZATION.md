# XMTP Chat for Live Videos - Optimization Guide

## Current Implementation Analysis

### ✅ What Works Well for Live Videos

1. **Real-time Message Streaming**: The `streamAllGroupMessages` API provides real-time updates
2. **Optimistic Updates**: Messages appear immediately before confirmation
3. **Group-based Architecture**: XMTP groups handle multiple participants well
4. **Tip Integration**: Real-time tip notifications work great for live streams

### ⚠️ Potential Issues for Live Videos

1. **Persistent Groups**: Current implementation creates one persistent group per `videoId`
   - For live videos, you might want session-based groups (one per stream session)
   - Old messages from previous sessions could clutter the chat

2. **No Message Rate Limiting**: High-volume live chats could overwhelm the UI
3. **No Virtual Scrolling**: All messages are rendered, which could cause performance issues with 1000+ messages
4. **No Message Prioritization**: All messages treated equally (tips vs. regular messages)
5. **No Ephemeral Messages**: All messages persist forever

## Recommended Optimizations for Live Videos

### 1. Session-Based Groups

Instead of one persistent group per video, create groups per live stream session:

```typescript
// For live videos, use session-based group IDs
const getGroupId = (isLive: boolean, videoId: string, sessionId?: string) => {
  if (isLive && sessionId) {
    return `live-${videoId}-${sessionId}`; // One group per session
  }
  return `vod-${videoId}`; // Persistent group for on-demand
};
```

### 2. Message Rate Limiting

Add rate limiting to prevent spam:

```typescript
const MESSAGE_RATE_LIMIT = 5; // messages per 10 seconds
const lastMessages = useRef<number[]>([]);

const canSendMessage = () => {
  const now = Date.now();
  const recent = lastMessages.current.filter(
    time => now - time < 10000
  );
  return recent.length < MESSAGE_RATE_LIMIT;
};
```

### 3. Virtual Scrolling

For high-volume chats, implement virtual scrolling:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => messagesContainerRef.current,
  estimateSize: () => 60,
  overscan: 10,
});
```

### 4. Message Prioritization

Prioritize certain message types (tips, creator messages):

```typescript
const sortedMessages = useMemo(() => {
  return [...messages].sort((a, b) => {
    // Tips first
    if (a.type === 'tip' && b.type !== 'tip') return -1;
    if (b.type === 'tip' && a.type !== 'tip') return 1;
    // Then by timestamp
    return a.sentAt.getTime() - b.sentAt.getTime();
  });
}, [messages]);
```

### 5. Message Cleanup for Live Streams

Auto-cleanup old messages to prevent memory issues:

```typescript
useEffect(() => {
  if (!isLive) return;
  
  const cleanup = setInterval(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    setMessages(prev => 
      prev.filter(msg => msg.sentAt.getTime() > fiveMinutesAgo)
    );
  }, 60000); // Cleanup every minute
  
  return () => clearInterval(cleanup);
}, [isLive]);
```

### 6. Performance Optimizations

- **Debounce scroll updates**: Don't scroll on every message in high-volume chats
- **Batch message updates**: Group multiple messages together
- **Lazy load old messages**: Only load recent messages initially

## Implementation Recommendations

### Option 1: Enhance Current Hook (Recommended)

Add a `mode` parameter to `useVideoChat`:

```typescript
export function useVideoChat(
  videoId: string,
  options?: {
    mode?: 'live' | 'vod';
    sessionId?: string;
    maxMessages?: number;
    enableRateLimit?: boolean;
  }
)
```

### Option 2: Create Separate Hook

Create `useLiveVideoChat` with live-specific optimizations:

```typescript
export function useLiveVideoChat(
  streamId: string,
  sessionId: string
): UseVideoChatReturn
```

## Comparison: Live vs On-Demand

| Feature | On-Demand (Current) | Live (Recommended) |
|---------|---------------------|-------------------|
| Group Persistence | ✅ Persistent | ⚠️ Session-based |
| Message History | ✅ Full history | ⚠️ Recent only (5-10 min) |
| Rate Limiting | ❌ None | ✅ Required |
| Virtual Scrolling | ⚠️ Optional | ✅ Recommended |
| Message Cleanup | ❌ None | ✅ Auto-cleanup |
| Performance | ✅ Good | ⚠️ Needs optimization |

## Conclusion

**The current implementation CAN work for live videos**, but would benefit from:

1. ✅ Session-based groups (instead of persistent)
2. ✅ Message rate limiting
3. ✅ Virtual scrolling for high volume
4. ✅ Auto-cleanup of old messages
5. ✅ Better performance optimizations

**Recommendation**: Enhance the current `useVideoChat` hook with an optional `mode` parameter to support both use cases without duplicating code.


