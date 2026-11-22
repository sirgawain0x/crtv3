import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";
import { NextRequest, NextResponse } from 'next/server';
import { requireHumanOrVerifiedBot } from '@/lib/middleware/botIdGuard';
import { rateLimiters } from '@/lib/middleware/rateLimit';
import { requireWalletAuth } from '@/lib/auth/require-wallet';
import { serverLogger } from '@/lib/utils/logger';
import {
  isHermesCreativeTvConfigured,
  runCreativeTvWorkflow,
  type CreativeTvMessage,
  type CreativeTvTask,
} from '@/lib/agent/hermes-creative-tv';

const ALLOWED_TASKS: ReadonlySet<CreativeTvTask> = new Set([
  'show_notes',
  'curation',
  'thumbnail_tags',
  'chat',
]);

export async function POST(req: NextRequest) {
  const botGuard = await requireHumanOrVerifiedBot('creative-tv', req);
  if (!botGuard.allowed) return botGuard.response;

  const rl = await rateLimiters.standard(req);
  if (rl) return withPlatformApiPaymentHeaders(rl, botGuard);

  let verifiedAddress: string;
  try {
    const wallet = await requireWalletAuth(req);
    verifiedAddress = wallet.address;
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as any).status : 401;
    const message = err instanceof Error ? err.message : 'Wallet authentication required';
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: message }, { status }), botGuard);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }), botGuard);
  }

  const rawTask = typeof body.task === 'string' ? (body.task.trim() as CreativeTvTask) : 'chat';
  const task: CreativeTvTask = ALLOWED_TASKS.has(rawTask) ? rawTask : 'chat';

  const messages = Array.isArray(body.messages)
    ? (body.messages.filter(
        (m): m is CreativeTvMessage =>
          Boolean(m) &&
          typeof m === 'object' &&
          ((m as any).role === 'user' || (m as any).role === 'assistant' || (m as any).role === 'system') &&
          typeof (m as any).content === 'string' &&
          (m as any).content.trim().length > 0,
      ) as CreativeTvMessage[])
    : [];

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : [];

  if (messages.length === 0 && !title && !description && !transcript && !videoUrl) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: 'Provide messages or video metadata (title, description, transcript, videoUrl)' },
      { status: 400 },
    ), botGuard);
  }

  if (!isHermesCreativeTvConfigured()) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: 'Hermes creative-tv specialist is not configured (HERMES_GATEWAY_API_KEY missing)' },
      { status: 503 },
    ), botGuard);
  }

  try {
    const result = await runCreativeTvWorkflow({
      task,
      title,
      description,
      transcript,
      videoUrl,
      tags,
      messages,
      user: verifiedAddress,
      signal: req.signal,
    });
    return withPlatformApiPaymentHeaders(NextResponse.json(result), botGuard);
  } catch (error) {
    serverLogger.error('[CreativeTV] Hermes creative-tv workflow error:', error);
    const message = error instanceof Error ? error.message : 'Creative TV request failed';
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: message }, { status: 502 }), botGuard);
  }
}
