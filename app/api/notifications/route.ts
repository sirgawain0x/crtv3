import { NextRequest, NextResponse } from 'next/server';
import { checkBotIdDeep } from '@/lib/middleware/botIdGuard';
import { rateLimiters } from '@/lib/middleware/rateLimit';
import { supabaseService } from '@/lib/sdk/supabase/service';
import { createClient } from '@/lib/sdk/supabase/server';
import { serverLogger } from '@/lib/utils/logger';
import { notificationInbox, markNotificationRead, subscribePush, unsubscribePush, pushDeviceStatus, dispatchPush, testPush } from '@/lib/notifications';

function getSupabase() {
  return supabaseService || createClient();
}

// GET /api/notifications - Get user's notification inbox
export async function GET(request: NextRequest) {
  try {
    // Get the user from the request - in a real implementation, this would come from auth
    // For now, we'll use a header or query param
    const ownerId = request.headers.get('x-user-id') || request.nextUrl.searchParams.get('ownerId');

    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: 'ownerId is required' },
        { status: 400 }
      );
    }

    const inbox = await notificationInbox(ownerId);

    return NextResponse.json({
      success: true,
      data: inbox,
    });
  } catch (error) {
    serverLogger.error('Error fetching notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
      },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Handle notification actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Get the user ID
    const ownerId = request.headers.get('x-user-id') || data.ownerId;

    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: 'ownerId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'read': {
        const result = await markNotificationRead(ownerId, data.id);
        return NextResponse.json({ success: true, data: result });
      }

      case 'push-subscribe': {
        const rl = await rateLimiters.standard(request);
        if (rl) return rl;

        const result = await subscribePush(ownerId, data);
        return NextResponse.json({ success: true, data: result });
      }

      case 'push-unsubscribe': {
        const result = await unsubscribePush(ownerId, data.endpoint);
        return NextResponse.json({ success: true, data: result });
      }

      case 'push-status': {
        const result = await pushDeviceStatus(ownerId, data.endpoint);
        return NextResponse.json({ success: true, data: result });
      }

      case 'push-test': {
        const rl = await rateLimiters.standard(request);
        if (rl) return rl;

        const result = await testPush(ownerId);
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    serverLogger.error('Error handling notification action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle notification action',
      },
      { status: 500 }
    );
  }
}
