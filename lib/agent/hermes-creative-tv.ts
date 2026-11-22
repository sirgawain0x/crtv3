import 'server-only';
import { HERMES_X402_GATEWAY_URL } from '@/lib/payments/x402-config';

export type CreativeTvMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type CreativeTvTask = 'show_notes' | 'curation' | 'thumbnail_tags' | 'chat';

export interface CreativeTvChatResult {
  content: string;
  model: string;
  usage?: Record<string, unknown>;
}

export function getHermesGatewayUrl(): string {
  return (process.env.HERMES_X402_GATEWAY_URL?.trim() || HERMES_X402_GATEWAY_URL).replace(
    /\/+$/,
    '',
  );
}

export function isHermesCreativeTvConfigured(): boolean {
  return Boolean(process.env.HERMES_GATEWAY_API_KEY?.trim());
}

export async function chatWithCreativeTv(
  messages: CreativeTvMessage[],
  options?: { user?: string; signal?: AbortSignal },
): Promise<CreativeTvChatResult> {
  const apiKey = process.env.HERMES_GATEWAY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('HERMES_GATEWAY_API_KEY is not configured');
  }

  const endpoint = `${getHermesGatewayUrl()}/v1/internal/creative-tv`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      ...(options?.user ? { user: options.user } : {}),
    }),
    signal: options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(95_000)]) : AbortSignal.timeout(95_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Creative TV gateway returned HTTP ${response.status}`);
  }

  const parsed = JSON.parse(text) as {
    model?: string;
    usage?: Record<string, unknown>;
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawContent = parsed.choices?.[0]?.message?.content;
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  if (!content) {
    throw new Error('creative-tv profile returned an empty response');
  }

  return {
    content,
    model: parsed.model || 'creative-tv',
    ...(parsed.usage ? { usage: parsed.usage } : {}),
  };
}

export async function runCreativeTvWorkflow(input: {
  task: CreativeTvTask;
  title?: string;
  description?: string;
  transcript?: string;
  videoUrl?: string;
  tags?: string[];
  messages?: CreativeTvMessage[];
  user?: string;
  signal?: AbortSignal;
}): Promise<{
  ok: true;
  model: string;
  task: CreativeTvTask;
  content: string;
  usage?: Record<string, unknown>;
}> {
  if (input.task === 'chat' && Array.isArray(input.messages) && input.messages.length > 0) {
    const res = await chatWithCreativeTv(input.messages, {
      user: input.user,
      signal: input.signal,
    });
    return { ok: true, model: res.model, task: input.task, content: res.content, usage: res.usage };
  }

  const taskInstructions: Record<Exclude<CreativeTvTask, 'chat'>, string> = {
    show_notes:
      'Generate concise Creative TV show notes, chapter timestamps if transcript cues exist, and creator takeaways.',
    curation:
      'Recommend Creative TV channel placement, audience positioning, and token/MeToken viewer engagement hooks.',
    thumbnail_tags:
      'Suggest high-contrast thumbnail visual direction and discoverability tags for Creative TV.',
  };

  const metadataLines = [
    input.title?.trim() ? `Title: ${input.title.trim()}` : '',
    input.description?.trim() ? `Description: ${input.description.trim()}` : '',
    input.videoUrl?.trim() ? `Video URL: ${input.videoUrl.trim()}` : '',
    input.tags?.length ? `Existing Tags: ${input.tags.join(', ')}` : '',
    input.transcript?.trim() ? `Transcript / Notes:\n${input.transcript.trim()}` : '',
  ].filter(Boolean);

  const userMessages: CreativeTvMessage[] =
    Array.isArray(input.messages) && input.messages.length > 0
      ? input.messages
      : [{ role: 'user', content: metadataLines.join('\n\n') }];

  const result = await chatWithCreativeTv(
    [
      {
        role: 'system',
        content: taskInstructions[input.task === 'chat' ? 'curation' : input.task],
      },
      ...userMessages,
    ],
    { user: input.user, signal: input.signal },
  );

  return {
    ok: true,
    model: result.model,
    task: input.task,
    content: result.content,
    ...(result.usage ? { usage: result.usage } : {}),
  };
}
